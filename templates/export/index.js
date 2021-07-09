var fs=require('fs')
var _=require('lodash')

var files=fs.readdirSync(`${__dirname}`)
    .filter(x=>!x.match(/README.md|Makefile|index|test|outputs|.DS_Store/))
    .map(x=>require(`./${x}`))

module.exports={
    "Resources":_.assign.apply({},files),
    "Conditions": {},
    "AWSTemplateFormatVersion": "2010-09-09",
    "Description": "UBCO Bot nested export resources",
    "Outputs": require('./outputs'),
    "Parameters": {
        "CFNLambda":{"Type":"String"},
        "CFNInvokePolicy":{"Type":"String"},
        "BootstrapBucket":{"Type":"String"},
        "BootstrapPrefix":{"Type":"String"},
        "VarIndex": {"Type":"String"},
        "EsEndpoint": {"Type":"String"},
        "EsProxyLambda": {"Type":"String"},
        "ExportBucket": {"Type":"String"},
        "LexVersion": {"Type":"String"},
        // Lex V1
        "FallbackIntent": {"Type":"String"},
        "Intent":{"Type":"String"},
        "BotName":{"Type":"String"},
        // Lex V2
        "LexV2BotName": {"Type":"String"},
        "LexV2BotId": {"Type":"String"},
        "LexV2BotAlias": {"Type":"String"},
        "LexV2BotAliasId": {"Type":"String"},
        "LexV2BotLocaleIds": {"Type":"String"},
        "Api":{"Type":"String"},
        "ApiRootResourceId":{"Type":"String"},
        "Encryption":{"Type":"String"},
        "Stage":{"Type":"String"},
        "ApiDeploymentId":{"Type":"String"},
        "DefaultQnABotSettings": {"Type":"String"},
        "CustomQnABotSettings": {"Type":"String"},
        "KendraCrawlerSnsTopic":{"Type":"String"},
        "VPCSubnetIdList" : {"Type": "String"},
        "VPCSecurityGroupIdList": {"Type": "String"},
        "XraySetting": {"Type": "String"},
        "KendraCrawlerSnsTopic":{"Type":"String"}
    },
    "Conditions": {
        "VPCEnabled": { "Fn::Not": [
                { "Fn::Equals": [ "", { "Ref": "VPCSecurityGroupIdList" } ] }
            ] },
        "XRAYEnabled":{"Fn::Equals":[{"Ref":"XraySetting"},"TRUE"]},
    }
}

