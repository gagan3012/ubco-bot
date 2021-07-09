var fs=require('fs')
var _=require('lodash')

var examples=require(`./examples`);
var extensions=require(`./extensions`);
var resources=Object.assign(examples,extensions);
var outputs1=require('./outputs').outputs;
var outputs2=require('./examples/responsebots-lexv2').outputs;
var outputSNSTopic={"FeedbackSNSTopic":{"Value":{"Fn::GetAtt":["FeedbackSNS","TopicName"]}}};
var outputs=Object.assign(outputs1,outputs2,outputSNSTopic);

module.exports={
  "Resources":resources,
  "Conditions": {},
  "AWSTemplateFormatVersion": "2010-09-09",
  "Transform": "AWS::Serverless-2016-10-31",
  "Description": "UBCO Bot nested example resources",
  "Mappings": {},
  "Outputs": outputs,
  "Parameters": {
    "FulfillmentLambdaRole":{"Type":"String"},
    "QnAType":{"Type":"String"}, 
    "QuizType":{"Type":"String"},
    "Index":{"Type":"String"},
    "ESAddress":{"Type":"String"},
    "BootstrapBucket":{"Type":"String"},
    "BootstrapPrefix":{"Type":"String"},
    "FeedbackFirehose":{"Type":"String"},
    "FeedbackFirehoseName":{"Type":"String"},
    "CFNLambda":{"Type":"String"},
    "CFNLambdaRole":  {"Type":"String"},
    "LexV2CFNLambdaARN": {"Type":"String"},
    "LexV2ServiceLinkedRoleARN": {"Type":"String"},
    "ApiUrlName":{"Type":"String"},
    "AssetBucket":{"Type":"String"},
    "QIDLambdaArn":{"Type":"String"},
    "VPCSubnetIdList" : {"Type": "String"},
    "VPCSecurityGroupIdList": {"Type": "String"},
    "LexBotVersion": {"Type": "String"},
    "XraySetting": {"Type": "String"}
  },
   "Conditions": {
    "VPCEnabled": { "Fn::Not": [
        { "Fn::Equals": [ "", { "Ref": "VPCSecurityGroupIdList" } ] }
      ] },
    "XRAYEnabled":{"Fn::Equals":[{"Ref":"XraySetting"},"TRUE"]},
    "CreateLexV1Bots":{"Fn::Equals":[{"Ref":"LexBotVersion"},"LexV1 and LexV2"]},
    }
  }





