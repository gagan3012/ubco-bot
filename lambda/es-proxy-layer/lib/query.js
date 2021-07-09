//start connection
var _ = require('lodash');
var safeEval = require('safe-eval');
const aws = require('aws-sdk');
var request = require('./request');
var build_es_query = require('./esbodybuilder');
var handlebars = require('./handlebars');
var translate = require('./translate');
var kendra = require('./kendraQuery');
var kendra_fallback = require("./kendra");
// const sleep = require('util').promisify(setTimeout);


// use DEFAULT_SETTINGS_PARAM as random encryption key unique to this QnABot installation
var key = _.get(process.env, "DEFAULT_SETTINGS_PARAM", "fdsjhf98fd98fjh9 du98fjfd 8ud8fjdf");
var encryptor = require('simple-encryptor')(key);



async function run_query(req, query_params) {
    var onlyES = await isESonly(req, query_params);
    let response = "";
    // runs kendra query if question supported on Kendra and KENDRA_FAQ_INDEX is set
   if (!onlyES && _.get(req, "_settings.KENDRA_FAQ_INDEX")!=""){
        response= await run_query_kendra(req, query_params);
    } 
    else {
        response= await run_query_es(req, query_params);
    }
    console.log(`response ${JSON.stringify(response)}` )
    return response;
}

async function isESonly(req, query_params) {
    // returns boolean whether question is supported only on ElasticSearch
    // no_hits is ES only
    var no_hits_question = _.get(req, '_settings.ES_NO_HITS_QUESTION', 'no_hits');
    var ES_only_questions = [no_hits_question];
    if (ES_only_questions.includes(query_params['question'])) {
        return true
    }
    // QID querying is ES only
    if (query_params.question.toLowerCase().startsWith("qid::")) {
        return true
    }
    // setting topics is ES only
    if (_.get(query_params, 'topic')!="") {
        return true
    }
    //Don't send one word questions to Kendra
    if(query_params.question.split(" ").length  < 2){
        return true;
    }
    return false;
}

async function run_query_es(req, query_params) {
    
    var es_query = await build_es_query(query_params);
    var es_response = await request({
        url: `https://${req._info.es.address}/${req._info.es.index}/_doc/_search?search_type=dfs_query_then_fetch`,
        method: "GET",
        body: es_query
    });
    
    if (_.get(es_response, "hits.hits[0]._source")) {
        _.set(es_response, "hits.hits[0]._source.answersource", "ElasticSearch");
    }

    return es_response;
}


async function run_query_kendra(req, query_params) {
    console.log("Querying Kendra FAQ index: " + _.get(req, "_settings.KENDRA_FAQ_INDEX"));
    // calls kendraQuery function which duplicates KendraFallback code, but only searches through FAQs
    var request_params = {
        kendra_faq_index:_.get(req, "_settings.KENDRA_FAQ_INDEX"),
        maxRetries:_.get(req, "_settings.KENDRA_FAQ_CONFIG_MAX_RETRIES"),
        retryDelay:_.get(req, "_settings.KENDRA_FAQ_CONFIG_RETRY_DELAY"),
        minimum_score: _.get(req, "_settings.ALT_SEARCH_KENDRA_FAQ_CONFIDENCE_SCORE"),
        size:1,
        question: query_params.question,
        es_address: req._info.es.address,
        es_path: '/' + req._info.es.index + '/_doc/_search?search_type=dfs_query_then_fetch',
    } ;
    
    // optimize kendra queries for throttling by checking if KendraFallback idxs include KendraFAQIndex
    let alt_kendra_idxs = _.get(req, "_settings.ALT_SEARCH_KENDRA_INDEXES");
    if (alt_kendra_idxs && alt_kendra_idxs.length) {
        try {
            // parse JSON array of kendra indexes
            alt_kendra_idxs = JSON.parse(alt_kendra_idxs);
        } catch (err) {
            // assume setting is a string containing single index
            alt_kendra_idxs = [ alt_kendra_idxs ];
        }
    }
    if (alt_kendra_idxs.includes(request_params.kendra_faq_index)) {
        console.log(`optimizing for KendraFallback`);
        request_params['same_index'] = true ;
    }

    var kendra_response = await kendra.handler(request_params);
    console.log(kendra_response)
    if (_.get(kendra_response, "hits.hits[0]._source")) {
        _.set(kendra_response, "hits.hits[0]._source.answersource", "Kendra FAQ");
    }
    return kendra_response;
}

// resolves Lambda function name for bundled example lambdas refernced in env.
function getLambdaName(lambdaRef){
    var match=lambdaRef.match(/QNA:(.*)/);
    if(match){
        return process.env[match[1]] || lambdaRef;
    }else{
        return lambdaRef;
    }
}
// used to inoke either chaining rule lambda, or Lambda hook
async function invokeLambda (lambdaRef, req, res) {
    let lambdaName = getLambdaName(lambdaRef);
    console.log("Calling Lambda:", lambdaName);
    var event={req:req, res:res};
    var lambda= new aws.Lambda();
    var lambdares=await lambda.invoke({
        FunctionName:lambdaName,
        InvocationType:"RequestResponse",
        Payload:JSON.stringify(event)
    }).promise(); 
    var payload=lambdares.Payload;
    try {
        payload = JSON.parse(payload);
        if (_.get(payload,"req") && _.get(payload,"res")) {
            req = _.get(payload,"req") ;
            res = _.get(payload,"res") ;  
        }
    } catch (e) {
        // response is not JSON - noop
    }
    console.log("Lambda returned payload: ", JSON.stringify(payload));
    return [req, res, payload];
}

function merge_next(hit1, hit2) {
    if (hit1 === undefined) {
        return hit2;
    }
    console.log("Merge chained items");
    // merge plaintext answer
    if (hit1 && hit1.a) {
        hit2.a = hit1.a + hit2.a;
    }
    // merge markdown, if present in both items
    var md1 = _.get(hit1, "alt.markdown");
    var md2 = _.get(hit2, "alt.markdown");
    if (md1 && md2) {
        _.set(hit2, "alt.markdown", md1 + "\n" + md2);
    } else {
        console.log("Markdown field missing from one or both items; skip markdown merge");
    }
    // merge SSML, if present in both items
    var ssml1 = _.get(hit1, "alt.ssml");
    var ssml2 = _.get(hit2, "alt.ssml");
    if (ssml1 && ssml2) {
        // strip <speak> tags
        ssml1 = ssml1.replace(/<speak>|<\/speak>/g, "");
        ssml2 = ssml2.replace(/<speak>|<\/speak>/g, "");
        // concatenate, and re-wrap with <speak> tags
        _.set(hit2, "alt.ssml", "<speak>" + ssml1 + " " + ssml2 + "</speak>");
    } else {
        console.log("SSML field missing from one or both items; skip SSML merge");
    }
    // build arrays of Lambda Hooks and arguments
    var lambdahooks = _.get(hit1, "lambdahooks",[]);
    // if hits1 doesn't have a lambdahooks field (no previous merge), then initialize using 'l' and 'args' from hit 1
    if ( lambdahooks.length == 0 ) {
        lambdahooks = [
                {
                    l:      _.get(hit1, "l"),
                    args:   _.get(hit1, "args",[]),
                }
            ];
    }
    lambdahooks.push({
        l:      _.get(hit2, "l"),
        args:   _.get(hit2, "args",[]),        
    });
    _.set(hit2, "lambdahooks", lambdahooks);
    
    // all other fields inherited from item 2
    console.log("Chained items merged:", hit2);
    return hit2;
}

async function get_hit(req, res) {
    var query_params = {
        question: req.question,
        topic: _.get(req, 'session.topic', ''),
        from: 0,
        size: 1,
        minimum_should_match: _.get(req, '_settings.ES_MINIMUM_SHOULD_MATCH'),
        phrase_boost: _.get(req, '_settings.ES_PHRASE_BOOST'),
        use_keyword_filters: _.get(req, '_settings.ES_USE_KEYWORD_FILTERS'),
        keyword_syntax_types: _.get(req, '_settings.ES_KEYWORD_SYNTAX_TYPES'),
        syntax_confidence_limit: _.get(req, '_settings.ES_SYNTAX_CONFIDENCE_LIMIT'),
        score_answer_field: _.get(req, '_settings.ES_SCORE_ANSWER_FIELD'),
        fuzziness: _.get(req, '_settings.ES_USE_FUZZY_MATCH'),
        es_expand_contractions: _.get(req,'_settings.ES_EXPAND_CONTRACTIONS'),
        kendra_indexes: _.get(req,'_settings.ALT_SEARCH_KENDRA_INDEXES'),
        minimum_confidence_score: _.get(req,'_settings.ALT_SEARCH_KENDRA_FAQ_CONFIDENCE_SCORE')

    };
    var no_hits_question = _.get(req, '_settings.ES_NO_HITS_QUESTION', 'no_hits');
    var response = await run_query(req, query_params);
    console.log("Query response: ", JSON.stringify(response,null,2));
    var hit = _.get(response, "hits.hits[0]._source");
    
    _.set(res, "kendraResultsCached", response.kendraResultsCached);
    if (response.kendraResultsCached) console.log(`kendra results cached in res structure`);
    _.set(req, "session.qnabotcontext.kendra", response.kendra_context);
    if (response.kendra_context) console.log(`kendra context set in res session`);
    
    // ES fallback if KendraFAQ fails
    if (!hit && _.get(req, '_settings.KENDRA_FAQ_ES_FALLBACK', true)) {
        console.log('ElasticSearch Fallback');
        response = await run_query_es(req, query_params);
        if (_.get(response, "hits.hits[0]._source")) {
            _.set(response, "hits.hits[0]._source.answersource", "ElasticSearch Fallback");
        }
        hit = _.get(response, "hits.hits[0]._source");
    }
    
    if (hit) {
        res['got_hits'] = 1;  // response flag, used in logging / kibana
    } else if(query_params.kendra_indexes.length != 0) {
        console.log("request entering kendra fallback " + JSON.stringify(req))
        hit = await  kendra_fallback.handler({req,res})
        console.log("Result from Kendra " + JSON.stringify(hit))
        if(hit &&  hit.hit_count != 0)
        {
            _.set(res,"answersource","Kendra Fallback");
            _.set(res,"session.qnabot_gotanswer",true) ; 
            _.set(res,"message", hit.a);
            _.set(req,"debug",hit.debug)
            res['got_hits'] = 1;

        }

    }
    if(!hit)
    {
        console.log("No hits from query - searching instead for: " + no_hits_question);
        query_params['question'] = no_hits_question;
        res['got_hits'] = 0;  // response flag, used in logging / kibana
        
        response = await run_query(req, query_params);

        hit = _.get(response, "hits.hits[0]._source");

        console.log("No hits response: " + JSON.stringify(hit))
    }
    // Do we have a hit?
    if (hit) {
        console.log("Setting topic for " + JSON.stringify(hit))
        // set res topic from document before running handlebars, so that handlebars can access or overwrite it.
         _.set(res, "session.topic", _.get(hit, "t"));
        
        if(_.get(hit, "t")){
            if(!res._userInfo){
                res._userInfo = {}
            }
            if(!res._userInfo.recentTopics){
                res._userInfo.recentTopics = []
            }
            res._userInfo.recentTopics.push({
                topic: _.get(hit, "t"),
                dateTime: (new Date()).toISOString()
            })
        }
        // run handlebars template processing
        hit = await handlebars(req, res, hit);

        // encrypt conditionalChaining rule, if set
        const conditionalChaining = _.get(hit, "conditionalChaining");
        if (conditionalChaining) {
            console.log("Encrypt conditionalChaining rule to ensure it is tamper proof in session attributes");
            const encrypted = encryptor.encrypt(conditionalChaining);
            _.set(hit, "conditionalChaining", encrypted);
        }
        
        // update the res object with the hit results
        res = update_res_with_hit(req, res, hit); 
        
        // Call Lambda Hook with args now & override running as middleware step (old behavior)
        // This results in:
        //  - improved predictability of document chaining behavior.. each doc's lambda is run as it is chained
        //  - autotranslation is now applied to lambda hook responses by default when response is assembled
        // optional setting to turn off this behaviour if it causes problems, and revert to old way
        if (_.get(req, '_settings.RUN_LAMBDAHOOK_FROM_QUERY_STEP', true)) {// && res['got_hits'] == 1) { //
            var lambdaHook = _.get(hit, "l");
            if (lambdaHook) {
                var payload;
                console.log("Invoking Lambda Hook function: ", lambdaHook);
                [req, res, payload] = await invokeLambda(lambdaHook, req, res);
                // update hit with values returned in res by lambda hook
                _.set(hit, "a", _.get(res,"message",""));
                var markdown = _.get(res,"session.appContext.altMessages.markdown","");
                var ssml = _.get(res,"session.appContext.altMessages.ssml","");
                var card = _.get(res,"card",{})
                _.set(hit, "alt.markdown", markdown);
                _.set(hit, "alt.ssml", ssml);
                _.set(hit,"r",card)
          
            }
            _.set(hit,"l","") ;
            _.set(hit,"args",[]) ;
        }
    }
    return [req, res, hit];
}



/**
 * Central location to evaluate conditional chaining. Chaining can take place either when an elicitResponse is
 * complete or during the normal course of question processing. A question can be chained even if it is not
 * involved in an elicitResponse.
 * @param req
 * @param res
 * @param hit - the original hit found through a query. note this may be a "fakeHit" in the case of elicitResponse processing.
 * @param conditionalChaining
 * @returns {Promise<*>}
 */
async function evaluateConditionalChaining(req, res, hit, conditionalChaining) {
    console.log("evaluateConditionalChaining req: ", JSON.stringify(req, null, 2));
    console.log("evaluateConditionalChaining res: ", JSON.stringify(res, null, 2));
    console.log("evaluateConditionalChaining hit: ", JSON.stringify(hit, null, 2));
    // decrypt conditionalChaining
    conditionalChaining = encryptor.decrypt(conditionalChaining);
    console.log("Decrypted Chained document rule specified:", conditionalChaining);
    var next_q;
    // If chaining rule a lambda, or an expression?
    if (conditionalChaining.toLowerCase().startsWith("lambda::")) {
        // Chaining rule is a Lambda function
        var lambdaName = conditionalChaining.split("::")[1] ;
        var payload;
        [req, res, payload] = await invokeLambda (lambdaName, req, res);
        console.log("Chaining Rule Lambda response payload: ", payload);
        try {
            payload = JSON.parse(payload);
        } catch (e) {
            // response is not JSON
        }
        if (_.get(payload,"req") && _.get(payload,"res")) {
            next_q = _.get(payload,"req.question");
        }
        else {
            console.log("Chaining Rules Lambda did not return session event in response.");
            console.log("assume response is a simple string containing next_q value");
            next_q = payload ;
        }
    } else {
        // create chaining rule safeEval context, aligned with Handlebars context
        const SessionAttributes = (arg) => _.get(SessionAttributes, arg, undefined);
        _.assign(SessionAttributes, res.session);
        const context={
            LexOrAlexa: req._type,
            UserInfo:req._userInfo, 
            SessionAttributes,
            Settings: req._settings,
            Question: req.question,
            OrigQuestion: _.get(req,"_event.origQuestion",req.question),
            PreviousQuestion: _.get(req, "session.qnabotcontext.previous.q", false),
            Sentiment: req.sentiment,
        };
        console.log("Evaluating:", conditionalChaining);
        // safely evaluate conditionalChaining expression.. throws an exception if there is a syntax error
        next_q = safeEval(conditionalChaining, context);
    }
    console.log("Chained document rule evaluated to:", next_q);
    req.question = next_q;
    var hit2;
    [req, res, hit2] = await get_hit(req, res);
    // if the question we are chaining to, also has conditional chaining, be sure to navigate set up
    // next user input to elicitResponse from this lex Bot.
    if (hit2) {
        const responsebot_hook = _.get(hit2, "elicitResponse.responsebot_hook", undefined);
        const responsebot_session_namespace = _.get(hit2, "elicitResponse.response_sessionattr_namespace", undefined);
        const chaining_configuration = _.get(hit2, "conditionalChaining", undefined);
        var elicitResponse = {} ;
        if (responsebot_hook && responsebot_session_namespace) {
            elicitResponse.responsebot = responsebot_hook;
            elicitResponse.namespace = responsebot_session_namespace;
            elicitResponse.chainingConfig = chaining_configuration;
            _.set(res.session, res.session.elicitResponseNamespace + ".boterror", undefined );
        } else {
            elicitResponse.responsebot = undefined;
            elicitResponse.namespace = undefined;
            elicitResponse.chainingConfig = chaining_configuration;
        }
        _.set(res.session,'qnabotcontext.elicitResponse',elicitResponse);
        var mergedhit = merge_next(hit, hit2);
        return [req, res, mergedhit] ;
    } else {
        console.log("WARNING: No documents found for evaluated chaining rule:", next_q);
        return [req, res, hit];
    }
}

function update_res_with_hit(req, res, hit) {
    res.result = hit;
    res.type = "PlainText";
    res.message = res.result.a;
    res.plainMessage = res.result.a;
    
    // Add answerSource for query hits
    var ansSource = _.get(hit, "answersource", "unknown");
    if (ansSource==="Kendra FAQ") { // kendra fallback sets answerSource directly
        res.answerSource = "KENDRA FAQ";
    } else if (ansSource==="ElasticSearch" || ansSource==="ElasticSearch Fallback") {
        res.answerSource = "ELASTICSEARCH";
    } else {
        res.answerSource = ansSource;
    }

    // Add alt messages to appContext session attribute JSON value (for lex-web-ui)
    var tmp;
    try {
        tmp=JSON.parse(_.get(res,"session.appContext","{}"));
    } catch(e) {
        tmp=_.get(res,"session.appContext","{}");
    }
    tmp.altMessages=_.get(res, "result.alt", {});
    _.set(res, "session.appContext",tmp);

    // Add reprompt 
    var rp = _.get(res, "result.rp");
    if (rp) {
        var type = 'PlainText';
        
        if (rp.includes("<speak>")) {
            type = 'SSML';
            rp = rp.replace(/\r?\n|\r/g, ' ');
        }
        _.set(res, "reprompt",{type, text : rp });
    }

    if (req._preferredResponseType == "SSML") {
        if (_.get(res, "result.alt.ssml")) {
            res.type = "SSML";
            res.message = res.result.alt.ssml.replace(/\r?\n|\r/g, ' ');
        }
    }
    console.log(res.message);
    var card = _.get(res, "result.r.title") ? res.result.r : null;

    if (card) {
        if (res.card === undefined) {
            res.card = {};
        }
        res.card.send = true;
        res.card.title = _.get(card, 'title');
        res.card.subTitle = _.get(card, 'subTitle');
        res.card.imageUrl = _.get(card, 'imageUrl');
        res.card.buttons = _.get(card, 'buttons');
    }

    var previousQid = _.get(res, "session.qnabotcontext.previous.qid", false);
    var navigationJson = _.get(res, "session.qnabotcontext.navigation", false);
    var previousArray = _.get(res, "session.qnabotcontext.navigation.previous", []);
    if (
        previousQid != _.get(res.result, "qid") &&
        _.get(navigationJson, "hasParent", true) == false &&
        req._info.es.type == 'qna') {
        if (previousArray.length == 0) {
            previousArray.push(previousQid);
        } else if (previousArray[previousArray.length - 1] != previousQid) {
            previousArray.push(previousQid);
        }
    }
    if (previousArray.length > 10) {
        previousArray.shift();
    }
    var hasParent = true;
    if ("next" in res.result) {
        hasParent = false;
    }
    _.set(res,"session.qnabotcontext.previous", {
        qid: _.get(res.result, "qid"),
        q: req.question
        }) ;
     _.set(res,"session.qnabotcontext.navigation", {
        next: _.get(res.result, "next", _.get(res, "session.qnabotcontext.navigation.next", "")),
        previous: previousArray,
        hasParent: hasParent
        }) ;
    res.session.qnabot_qid = _.get(res.result, "qid", "") ;
    res.session.qnabot_gotanswer = (res['got_hits'] > 0) ? true : false ;
    return res;
}

module.exports = async function (req, res) {
    let redactEnabled = _.get(req, '_settings.ENABLE_REDACTING');
    let redactRegex = _.get(req, '_settings.REDACTING_REGEX', "\\b\\d{4}\\b(?![-])|\\b\\d{9}\\b|\\b\\d{3}-\\d{2}-\\d{4}\\b");
    let cloudWatchLoggingDisabled = _.get(req, '_settings.DISABLE_CLOUDWATCH_LOGGING');

    if (redactEnabled) {
        process.env.QNAREDACT= "true";
        process.env.REDACTING_REGEX = redactRegex;
    } else {
        process.env.QNAREDACT="false";
        process.env.REDACTING_REGEX="";
    }
    if (cloudWatchLoggingDisabled) {
        process.env.CLOUDWATCHLOGGINGDISABLED="true";
    } else {
        process.env.CLOUDWATCHLOGGINGDISABLED="false";
    }
    const elicitResponseChainingConfig = _.get(res, "session.qnabotcontext.elicitResponse.chainingConfig", undefined);
    const elicitResponseProgress = _.get(res, "session.qnabotcontext.elicitResponse.progress", undefined);
    let hit = undefined;
    if (elicitResponseChainingConfig && (elicitResponseProgress === 'Fulfilled' || elicitResponseProgress === 'ReadyForFulfillment' || elicitResponseProgress === 'Close' || elicitResponseProgress === 'Failed' )) {
        // elicitResponse is finishing up as the LexBot has fulfilled its intent.
        // we use a fakeHit with either the Bot's message or an empty string.
        let fakeHit = {};
        fakeHit.a = res.message ? res.message : "";
        [req, res, hit] = await evaluateConditionalChaining(req, res, fakeHit, elicitResponseChainingConfig);
    } else {
        // elicitResponse is not involved. obtain the next question to serve up to the user.
        [req, res, hit] = await get_hit(req, res);
        
    }

    if (hit) {
        // found a document in elastic search.
        var c=0;
        while (_.get(hit, "conditionalChaining") && _.get(hit, "elicitResponse.responsebot_hook", "") === "" ) {
            c++;
            // ElicitResonse is not involved and this document has conditionalChaining defined. Process the
            // conditionalChaining in this case.
            [req, res, hit] = await evaluateConditionalChaining(req, res, hit, hit.conditionalChaining);
            console.log("Chained doc count: ", c);
            if (c >= 10) {
                console.log("Reached Max limit of 10 chained documents (safeguard to prevent infinite loops).") ;
                break ;
            }
        }
        // translate response
        var usrLang = 'en';
        if (_.get(req._settings, 'ENABLE_MULTI_LANGUAGE_SUPPORT')) {
            usrLang = _.get(req, 'session.qnabotcontext.userLocale');
            if (usrLang != 'en') {
                console.log("Autotranslate hit to usrLang: ", usrLang);
                hit = await translate.translate_hit(hit, usrLang,req);
            } else {
                console.log("User Lang is en, Autotranslate not required.");
            }
        }
        // prepend debug msg
        console.log("pre-debug " +JSON.stringify(req))
        if (_.get(req._settings, 'ENABLE_DEBUG_RESPONSES')) {
            var msg = "User Input: \"" + req.question + "\"";


            if (usrLang != 'en') {
                msg = "User Input: \"" + _.get(req,"_event.origQuestion","notdefined") + "\", Translated to: \"" + req.question + "\"";
            }
            if(req.debug)
            {
                msg += JSON.stringify(req.debug,2)
            }
            msg += ", Source: " + _.get(hit, "answersource", "unknown");
            var debug_msg = {
                a: "[" + msg + "] ",
                alt: {
                    markdown: "*[" + msg + "]*  \n",
                    ssml: "<speak>" + msg + "</speak>"
                },
                rp: "[" + _.get(hit, "rp") + "] "

            };
            hit = merge_next(debug_msg, hit) ;
        }
        res = update_res_with_hit(req, res, hit);
    } else {
        // no hit found
        res.type = "PlainText";
        res.message = _.get(req, '_settings.EMPTYMESSAGE', 'You stumped me!');
    }
    // add session attributes for qid and no_hits - useful for Amazon Connect integration
    res.session.qnabot_qid = _.get(res.result, "qid", "") ;
    res.session.qnabot_gotanswer = (res['got_hits'] > 0) ? true : false ;

    var event = {req, res} ;
    console.log("RESULT", JSON.stringify(event));
    return event ;
};
