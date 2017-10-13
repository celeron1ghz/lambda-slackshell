const es = require('shell-escape');

module.exports = {
    getCommand: function(param) {
        const args = param.text.split(' ');
        args.unshift('/home/ec2-user/acceptessa/server/tessa');
        args.push('--run_by');
        args.push(param.user_name);

        const escaped = es(args);
        return escaped;
    },

    getInstanceFilter: function(){
        return [{ Name: "tag:aws:autoscaling:groupName", Values: ["acceptessa-as"] }];
    },

    getVerifyToken: function(){
        return 'QM73Five3yx08SqTDadwsgZb';
    },
};
