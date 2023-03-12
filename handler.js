'use strict';

const aws = require('aws-sdk');
const ssm = new aws.SSM({ region: 'ap-northeast-1' });
const ec2 = new aws.EC2({ region: 'ap-northeast-1' });
const s3  = new aws.S3({ region: 'ap-northeast-1' });
const sf  = new aws.StepFunctions({ region: 'ap-northeast-1' });
const co  = require('co');

const config = require('./config.js');

module.exports.endpoint = (event, context, callback) => {
    const qs        = require('querystring');
    const query     = qs.parse(event.body);

    if (query.token !== config.getVerifyToken()) {
        console.error(`Request token (${query.token}) does not match exptected`);
        return context.succeed("Invalid request token");
    }

    if (!query.text) {
        return context.succeed({
            statusCode: 200,
            body: JSON.stringify({ response_type: "ephemeral", text: `Usage: ${query.command} <command>` }),
        });
    }

    co(function*(){
        const states = yield sf.listStateMachines().promise();
        const arn    = states.stateMachines.filter(s => s.name.match(/^SlackShell/)).map(s => s.stateMachineArn)[0];
        console.log("Running state machine:", arn);

        const ret = yield sf.startExecution({ input: JSON.stringify({ query: query }), stateMachineArn: arn }).promise();
        callback(null, { statusCode: 200, body: 'OK' });
    })
    .catch(err => {
        console.log("Error happen:", err)
        callback(null, { statusCode: 200, body: JSON.stringify({ text: err }) });
    })
};

module.exports.ssm_kick = (event, context, callback) => {
    co(function*(){
        const command = config.getCommand(event.query);
        console.log("command:", command);

        const ec2_result = yield ec2.describeInstances({ Filters: config.getInstanceFilter() }).promise();
        const instances  = ec2_result.Reservations[0].Instances.map(i => i.InstanceId);
        console.log("instances:", instances);

        const ssm_result = yield ssm.sendCommand({
            DocumentName: "AWS-RunShellScript",
            InstanceIds: instances,
            OutputS3Region: "ap-northeast-1",
            OutputS3BucketName: "slackshell-result",
            Parameters: { "commands": [command], "executionTimeout": ["86400"] }
        }).promise();

        callback(null, ssm_result.Command);
    })
    .catch(err => {
        console.log("error on kick:", err);
        callback(err);
    })
};

module.exports.ssm_status = (event, context, callback) => {
    ssm.listCommandInvocations({ CommandId: event.CommandId, Details: true }, (err,ret) => {
        if (err) { callback(err) }
        else     { callback(null, ret.CommandInvocations[0]) }
    })
};

module.exports.ssm_result = (event, context, callback) => {
    co(function*(){
        const ret = event.CommandPlugins[0];

        //const stdout = ssm_result.CommandInvocations[0].StandardOutputUrl;
        const stdout = `${event.CommandId}/${event.InstanceId}/awsrunShellScript/0.awsrunShellScript/stdout`;
        const out_result = yield s3.getObject({ Bucket: "slackshell-result", Key: stdout }).promise().catch(err => null);

        if (out_result) {
            console.log("########## STDOUT ##########");
            console.log(out_result.Body.toString());
        }

        //const stderr = ssm_result.CommandInvocations[0].StandardErrorUrl;
        const stderr = `${event.CommandId}/${event.InstanceId}/awsrunShellScript/0.awsrunShellScript/stderr`;
        const err_result = yield s3.getObject({ Bucket: "slackshell-result", Key: stderr }).promise().catch(err => null);

        if (err_result) {
            console.log("########## STDERR ##########");
            console.log(err_result.Body.toString());
        }

        callback(null, 'OK');
    })
    .catch(err => {
        console.log("error on result:", err);
        callback(err);
    })
};
