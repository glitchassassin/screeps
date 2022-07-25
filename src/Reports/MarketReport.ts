import { Dashboard, Label, Rectangle, Table } from "screeps-viz";
import { allMarketOrders } from "Selectors/marketEnabled";

interface MarketReportOpts {
    filter?: ((o: Order) => boolean)
}

export default (opts: MarketReportOpts = {}) => {
    const orders = allMarketOrders().filter(o => !opts.filter || opts.filter(o));
    const buyOrders = [];
    const sellOrders = [];

    for (let o of orders) {
        if (o.type === ORDER_BUY && buyOrders.length < 45) {
            buyOrders.push(o)
        } else if (sellOrders.length < 45) {
            sellOrders.push(o)
        }
        if (buyOrders.length >= 45 && sellOrders.length >= 45) break;
    }

    const sortOrders = (a: Order, b: Order) => {
        if (a.resourceType > b.resourceType) {
            return 1;
        } else if (a.resourceType < b.resourceType) {
            return -1;
        } else {
            if (a.type > b.type) {
                return 1;
            } else if (a.type < b.type) {
                return -1;
            } else {
                if (a.type === ORDER_BUY) {
                    return b.price - a.price;
                } else {
                    return a.price - b.price;
                }
            }
        }
    }

    buyOrders.sort(sortOrders);
    sellOrders.sort(sortOrders);


    Dashboard({
        widgets: [
            {
                pos: {x: 1, y: 1},
                width: 23,
                height: 2,
                widget: Rectangle({ data: Label({ data: 'Buy Orders' }) })
            },
            {
                pos: {x: 25, y: 1},
                width: 23,
                height: 2,
                widget: Rectangle({ data: Label({ data: 'Sell Orders' }) })
            },
            {
                pos: {x: 1, y: 3},
                width: 23,
                height: 45,
                widget: Rectangle({ data: Table({
                    data: buyOrders.map(o => {
                        return [
                            o.resourceType,
                            o.roomName ?? '--',
                            o.remainingAmount + ' / ' + o.amount,
                            o.price.toLocaleString('en-US')
                        ]
                    }),
                    config: {
                        headers: ['Order', 'Room', 'Amount', 'Price']
                    }
                })})
            },{
                pos: {x: 25, y: 3},
                width: 23,
                height: 45,
                widget: Rectangle({ data: Table({
                    data: sellOrders.map(o => {
                        return [
                            o.resourceType,
                            o.roomName ?? '--',
                            o.remainingAmount + ' / ' + o.amount,
                            o.price.toLocaleString('en-US')
                        ]
                    }),
                    config: {
                        headers: ['Order', 'Room', 'Amount', 'Price']
                    }
                })})
            }
        ]
    })
}
