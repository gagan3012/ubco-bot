module.exports={
    "TestAllStack":{
        "Type" : "AWS::CloudFormation::Stack",
        "Properties" : {
            "TemplateURL" :{"Fn::Sub":"http://${BootstrapBucket}.s3.${AWS::Region}.amazonaws.com/${BootstrapPrefix}/templates/testall.json"},
            "Parameters" :{
                "CFNLambda":{"Fn::GetAtt":["CFNLambda","Arn"]},
                "CFNInvokePolicy":{"Ref":"CFNInvokePolicy"},
                "LexV2BotId":{"Fn::GetAtt":["LexV2Bot","botId"]},
                "LexV2BotAliasId":{"Fn::GetAtt":["LexV2Bot","botAliasId"]},
                "BootstrapBucket":{"Ref":"BootstrapBucket"},
                "BootstrapPrefix":{"Ref":"BootstrapPrefix"},
                "VarIndex": {"Fn::GetAtt": ["Var", "QnaIndex"]},
                "EsEndpoint": {"Fn::GetAtt": ["ESVar", "ESAddress"]},
                "EsProxyLambda": {"Fn::GetAtt":["ESProxyLambda","Arn"]},
                "TestAllBucket": {"Ref":"TestAllBucket"},
                "VPCSubnetIdList" : { "Fn::Join" : [ ",", {"Ref":"VPCSubnetIdList"} ] },
                "VPCSecurityGroupIdList": { "Fn::Join" : [ ",", {"Ref":"VPCSecurityGroupIdList"} ] },
                "XraySetting":{"Ref": "XraySetting"},
            }
        }
    }
}