var fs=require('fs')
var _=require('lodash')

var files=fs.readdirSync(`${__dirname}`)
    .filter(x=>!x.match(/README.md|Makefile|index|test|outputs|.DS_Store/))
    .map(x=>require(`./${x}`))

module.exports={
    "Resources":_.assign.apply({},files),
    "Conditions": {},
    "AWSTemplateFormatVersion": "2010-09-09",
    "Description": "UBCO Bot nested testall resources",
    "Outputs": require('./outputs'),
    "Parameters": {
        "CFNLambda":{"Type":"String"},
        "CFNInvokePolicy":{"Type":"String"},
        "LexV2BotId":{"Type":"String"},
        "LexV2BotAliasId":{"Type":"String"},
        "BootstrapBucket":{"Type":"String"},
        "BootstrapPrefix":{"Type":"String"},
        "VarIndex": {"Type":"String"},
        "EsEndpoint": {"Type":"String"},
        "EsProxyLambda": {"Type":"String"},
        "TestAllBucket": {"Type":"String"},
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