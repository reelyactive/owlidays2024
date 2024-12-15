
/**
 * Copyright reelyActive 2024
 * We believe in an open Internet of Things
 */


class Choir  {

    constructor(db){
        this.members = {};
        this.allChannels = [];
        this.db = db;   
    }

    init(){
        this.members = {};
        this.allChannels = [];
    }

    hasMembers(){
        this.db.log("hasMembers?", Object.keys(this.members).length)
        if(Object.keys(this.members).length > 0){
            return true;
        }
        return false;
    }

    allMembersCallback(callback){
        let memberkeys = Object.keys(this.members);
        // unset channels for all members
        for(let i = 0; i < memberkeys.length; i++){
            let member = this.members[memberkeys[i]];
            callback(memberkeys[i], member);
        }        
    }

    addMember(uniqID, ip){
        this.members[ip] = {uniqID : uniqID,
                                ip: ip,
                                channels : []
        };
        this.db.log("add member",  this.members);
    }

    removeMember(ip){
        this.db.log("removing ", ip);
        delete this.members[ip];
        this.db.log(this.members);
    }

    distributeChannels(){
        let memberkeys = Object.keys(this.members);
        // unset channels for all members
        for(let i = 0; i < memberkeys.length; i++){
            this.members[memberkeys[i]].channels = [];
        }
        let mi = 0;
        let ci = 0;
        this.db.prodlog(memberkeys.length + " clients connected");
        this.db.log("distributing", memberkeys, this.allChannels);
        while(ci < this.allChannels.length || mi < memberkeys.length){
            this.db.log("loop ", ci, mi, this.allChannels.length, memberkeys.length);
            let channel = this.allChannels[ci % this.allChannels.length];
            let member = this.members[memberkeys[mi % memberkeys.length]]
            member.channels.push(channel);
            mi++;
            ci++;
        }
        this.db.log("distributed" , this.members);
    }

}

module.exports = Choir;