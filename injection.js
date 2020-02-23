


/*
var tableId = null
var trends = [];
var poolMap = {
    
}
var BetType = {};
BetType.BANKER = 1; 
BetType.PLAYER = 2; 
BetType.TIE = 3; 
BetType.BANKER_PAIR = 4; 
BetType.PLAYER_PAIR = 5; 
BetType.BIG = 6; 
BetType.SMALL = 7; 
BetType.BANKER_N8 = 8; 
BetType.PLAYER_N8 = 9; 
BetType.BANKER_N9 = 10; 
BetType.PLAYER_N9 = 11; 
BetType.SUPER = 12;
var catMap = {
    '1': 'BANKER',
    '2' : 'PLAYER',
    '3': 'TIE',
    '4': 'BANKER_PAIR',
    '5' : 'PLAYER_PAIR',
    '6' : 'BIG',
    '7' : 'SMALL',
    '8' : 'BANKER_N8',
    '9' : 'PLAYER_N8',
    '10' : 'BANKER_N9',
    '11' : 'PLAYER_N9',
    '12' : 'SUPER',
}

function handleEvent(evt) {
    var msg = JSON.parse(evt.data);
    switch (msg.kind) {
        case 'trends': // first come room, kết quả các round trước
            // init var trend here
            break;
        case 'commitsucceed': // result khi kết thúc ván, cộng dồn vào trends
            // push commit to trend
            break;
        case 'pool': // số liệu đặt cửa
            
            break;
        default:
            break;
    }
}
*/



function HahaInjection() {
    this.tableId = null;
    this.pools = []; // số liệu  từng round ở đây, bao gôm id, round, người thắng, cards, tiền đặt cược
    this.currentPool = null // pool hiện tại
    this.catMap = {
        '1': 'BANKER',
        '2': 'PLAYER',
        '3': 'TIE',
        '4': 'BANKER_PAIR',
        '5': 'PLAYER_PAIR',
        '6': 'BIG',
        '7': 'SMALL',
        '8': 'BANKER_N8',
        '9': 'PLAYER_N8',
        '10': 'BANKER_N9',
        '11': 'PLAYER_N9',
        '12': 'SUPER',
    }

    /**
    * {
           "roundid": 91014573,
           "shoe": 4,
           "round": 1,
           "result": "010001000000",
           "cards": "CKS6#D7D9D5"
       }
    * @param {object} trendPool 
    */
    this.analizeTrendPool =
         (trendPool) => {
            var winners = trendPool.result.split("").reduce((acc, cur, index) => {
                if (cur == '1') {
                    var n = catMap[(index + 1).toString()]
                    acc.push(n)
                }
                return acc;
            }, []);
            var cards = trendPool.cards.split("#")

            return Object.assign({}, trendPool, {
                winners: winners,
                playerCards: cards[0],
                bankerCards: cards[1]
            });
        }
    
    this.handleTrendMessage = (mgs) => {
        this.tableId = msg.content.table
        this.pools = msg.content.values.map(item => this.analizeTrendPool(item));       
        window.localStorage.setItem('@table_' + this.tableId, JSON.stringify(this.pools)) 
    }
    
    this.handleStartBet = msg => {
        this.currentPool = {
            table:  msg.content.table,
            round: msg.content.round,
            roundid: msg.content.roundid,
            shoe: msg.content.shoe,
            cat: [],
            amount: [],
            volume: {}
        }
    }
    
    this.mapVolume = (cats, amounts) => {
        var result = {};
        for (let index = 0; index < cats.length; index++) {
            const catId = cats[index];
            const catKey = this.catMap[catId];
            result[catKey] = amounts[index]
        }
        return result;
    }
    
    this.handlePoolMessage = msg => {
        this.currentPool.cat = msg.content.cat;
        this.currentPool.amount = msg.content.amount;
        this.currentPool.volume = this.mapVolume(msg.content.cat, msg.content.amount)
    }
    
    this.handleCommitSucceed = (msg) => {
        var pool = this.analizeTrendPool(msg.content);
        pool = Object.assign(pool, {
            cat: this.currentPool.cat,
            amount: this.currentPool.amount,
            volume: this.currentPool.volume,
        });
        
        this.pools.push(pool);
        this.currentPool = null;
        window.localStorage.setItem('@table_' + this.tableId, JSON.stringify(this.pools))
    }
    /**
     * thứ tự khi vào room, trends
     * startbetsucceed (nhận đặt cược) -> [coundown 12->0 -> pool (nhiều, pool là số liệu cuối)] -> stopbetsucceed -> commitsucceed  
     */
    this.handleMessage = (evt) => {
        var msg = JSON.parse(evt.data);
        switch (msg.kind) {            
            case 'trends': // first come room, kết quả các round trước
                this.handleTrendMessage(msg);
                break;
            case 'startbetsucceed':
                this.handleStartBet(msg);
                break;
            case 'pool': // số liệu đặt cửa
                this.handlePoolMessage(msg)
                break;
            case 'commitsucceed': // result khi kết thúc ván, cộng dồn vào trends
                // push commit to trend
                this.handleCommitSucceed(msg)
                break;
            default:
                break;
        }
    }
}
var myHahaInjection = new HahaInjection();
netutils.webSocket.onmessage = function (evt) { netutils.onMessage(evt); myHahaInjection.handleMessage(evt) }