# SlackShell
SlackのSlash CommandでEC2上でコマンド実行を行う。


## SETUP
### ON serverless
```
## serverlessでセットアップ
git clone https://github.com/celeron1ghz/lambda-slackshell.git
cd lambda-slackshell
sls deploy
```

### ON slack config
`sls deploy` で表示されるURLをSlash CommandのURLに登録する


## REQUIRED CREDSTASH VARIABLES
Nothing


## SEE ALSO
 * https://github.com/celeron1ghz/lambda-slackshell
