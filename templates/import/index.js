var fs=require('fs')
var _=require('lodash')

var files=fs.readdirSync(`${__dirname}`)
    .filter(x=>!x.match(/README.md|Makefile|index|test|outputs|.DS_Store/))
    .map(x=>require(`./${x}`))

module.exports={
    "Resources":_.assign.apply({},files),
    "Conditions": {},
    "AWSTemplateFormatVersion": "2010-09-09",
    "Description": "UBCO Bot nested import resources",
    "Outputs": require('./outputs'),
    "Parameters": {
        "CFNLambda":{"Type":"String"},
        "CFNInvokePolicy":{"Type":"String"},
        "BootstrapBucket":{"Type":"String"},
        "BootstrapPrefix":{"Type":"String"},
        "EsEndpoint": {"Type":"String"},
        "EsProxyLambda": {"Type":"String"},
        "ImportBucket": {"Type":"String"},
        "ExportBucket": {"Type":"String"},
        "VarIndex": {"Type":"String"},
        "MetricsIndex": {"Type":"String"},
        "FeedbackIndex": {"Type":"String"},
        "Encryption": {"Type":"String"},
        "VPCSubnetIdList" : {"Type": "String"},
        "VPCSecurityGroupIdList": {"Type": "String"},
        "XraySetting": {"Type": "String"}
    },
    "Conditions": {
        "VPCEnabled": { "Fn::Not": [
                { "Fn::Equals": [ "", { "Ref": "VPCSecurityGroupIdList" } ] }
            ] },
        "XRAYEnabled":{"Fn::Equals":[{"Ref":"XraySetting"},"TRUE"]},
    }
}