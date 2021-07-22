# Deployment Guide

## Requirements

Before you deploy, you must have the following in place:

- Run Linux. (tested on Ubuntu)
- Install npm >=7.10.0 and node >=12.16.1. (instructions)
- Clone this repo.
- Set up an AWS account. (instructions)
- Configure AWS CLI and a local credentials file. (instructions)

## Getting Started 

Two approaches can be used to get started. Deploy from pre-created repositories or use the CLI to deploy it.

### Pre-created deployment

Click a button to launch UBCO Bot CloudFormation stack in the desired region

| Region   |  Launch |
|----------|:-------------:|
| Northern Virginia (us-east-1) | <a target="_blank" href="https://us-east-1.console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/new?stackName=QnABot&templateURL="><span><img height="24px" src="https://s3.amazonaws.com/cloudformation-examples/cloudformation-launch-stack.png"/></span></a>     |

### CLI Deployment

First, install all prerequisites:

```shell
npm install 
```

Next, set up your configuration file:

```shell
npm run config
```
now edit config.json with you information.

| param | description |
|-------|-------------|
|region | the AWS region to launch stacks in |
|profile| the AWS credential profile to use |
|namespace| a logical name space to run your templates |
|devEmail | the email to use when creating admin users in automated stack launches |

Next, use the following command to launch a CloudFormation template to create the S3 bucket to be used for lambda code and CloudFormation templates.

```shell
npm run bootstrap
```

Finally, use the following command to launch template to deploy the UBCO bot in your AWS account.

```shell
npm run up
```

If you have an existing stack you can run the following to update your stack:

```shell
npm run update
```

