# UBC Okanagan Chatbot
## Project Overview
The UBCO Chatbot is a complement to the UBCO project. It aims to be a user-friendly channel of communication that students can easily use to ask questions about UBCO’s events and services such as: housing, academic advising, parking, among others. This will allow students to get the relevant information they need without having to spend a lot of time and effort looking for it on different websites. 

|Index| Description|
|:----------------|:-----------|
| [Demo](#demo)         |    See an example of a normal conversation that a user would have with the chatbot.    | 
| [Overview](#overview)         | See the main parts of the stack: frontend, backend and data.      | 
| [High Level Architecture Diagram](#high-level-architecture-diagram) |Diagram.     |
| [Deployment Guide](#deployment-guide) |A link to the deployment guide. |
| [User Guide](#user-guide) |  A link to the user guide.   |
| [Changelog](#changelog)      |     History of what has changed.     |
| [License](#license)      |     License details.     |

# Demo
# Overview

- Frontend - ReactJS on NodeJS as the core framework.
- Data - All data is saved in Amazon S3 and Amazon DynamoDB and is accessible via Kibana Dashboard.
- Auth - Cognito provides unique user login and authentication.
- Backend - In the backend we use AWS Lex, AWS Translate, AWS Comprehend and AWS Lambda Functions. 

# High Level Architecture Diagram
![architecture](https://user-images.githubusercontent.com/49101362/125141130-22711880-e0e2-11eb-9dcd-6f36e6464c03.png)

The first interaction that the user has with the chatbot is through the UI, which was built using AWS Lex Web UI (https://github.com/aws-samples/aws-lex-web-ui). The UI is then connected to the backend via API gateway. 

From there, the AWS Lex receives the query and through custom Lambda functions and predefined Lex bots, generates answers and stores them in a Dynamodb Table. The backend of the bot is supported by Elastisearch which is the server of the bot. 
# Deployment Guide

To deploy this solution into your AWS Account please follow our [Deployment Guide](https://github.com/gagan3012/ubco-bot/blob/master/docs/DEPLOYMENT_GUIDE.md)

# User Guide
# Timeline
# Changelog
* July 9, 2021: Initial release.
# License
This project is distributed under  [Apache-2.0](https://github.com/gagan3012/ubco-bot/blob/main/LICENSE) 
