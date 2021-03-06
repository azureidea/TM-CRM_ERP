"use strict";

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
        Schema = mongoose.Schema,
        timestamps = require('mongoose-timestamp');

var DataTable = require('mongoose-datatable');

DataTable.configure({
    verbose: false,
    debug: false
});
mongoose.plugin(DataTable.init);

var Dict = INCLUDE('dict');

var setPrice = MODULE('utils').setPrice;
var setDate = MODULE('utils').setDate;

/**
 * Article Schema
 */
var orderSchema = new Schema({
    ref: {type: String},
    /*title: {//For internal use only
        ref: String,
        autoGenerated: {
            type: Boolean,
            default: false
        } //For automatic process generated deliveries
    },*/
    isremoved: Boolean,
    Status: {type: Schema.Types.Mixed, default: 'DRAFT'},
    cond_reglement_code: {type: String, default: 'RECEP'},
    mode_reglement_code: {type: String, default: 'TIP'},
    //bank_reglement: {type: String},
    //availability_code: {type: String, default: 'AV_NOW'},
    type: {type: String, default: 'SRC_COMM'},
    client: {
        id: {type: Schema.Types.ObjectId, ref: 'Societe'},
        name: String,
        isNameModified: {type: Boolean},
        cptBilling: {
            id: {type: Schema.Types.ObjectId},
            name: String
        }
    },
    /*contact: {
     id: {
     type: Schema.Types.ObjectId,
     ref: 'contact'
     },
     name: {type: String, default:""},
     phone: String,
     email: String
     },*/
    contacts: [{type: Schema.Types.ObjectId, ref: 'contact'}],
    ref_client: {type: String, default: ""},
    datec: {type: Date, default: Date.now, set:setDate},
    date_livraison: {type: Date, set:setDate},
    notes: [{
            title: String,
            note: String,
            public: {type: Boolean, default: false},
            edit: {type: Boolean, default: false}
        }],
    total_ht: {type: Number, default: 0, set: setPrice},
    total_tva: [{
            tva_tx: Number,
            total: {type: Number, default: 0}
        }],
    total_ttc: {type: Number, default: 0},
    shipping: {
        total_ht: {type: Number, default: 0, set: setPrice},
        tva_tx: {type: Number, default: 20},
        total_tva: {type: Number, default: 0},
        total_ttc: {type: Number, default: 0}
    },
    author: {id: String, name: String},
    commercial_id: {
        id: {type: String},
        name: String
    },
    entity: String,
    modelpdf: String,
    //linked_objects: [{
    //        id: Schema.Types.ObjectId,
    //        name: String
    //    }],
    bills: [Schema.Types.ObjectId],
    deliveries: [{type: Schema.Types.ObjectId, ref:'delivery'}],
    offer: {type: Schema.Types.ObjectId, ref: 'offer'},
    groups: [Schema.Types.Mixed],
    optional: Schema.Types.Mixed,
    delivery_mode: {type: String, default: "Comptoir"},
    billing: {
        societe: {
            id: {type: Schema.Types.ObjectId, ref: 'societe'},
            name: String
        },
        contact: String,
        address: String,
        zip: String,
        town: String,
        country: String
    },
    price_level: {type: String, default: "BASE", uppercase: true, trim: true},
    bl: [{
            societe: {
                id: {type: Schema.Types.ObjectId, ref: 'societe'},
                name: String
            },
            label: String,
            name: String,
            contact: String,
            address: String,
            zip: String,
            town: String,
            products: [{
                    id: Schema.Types.ObjectId,
                    name: String,
                    qty: {
                        type: Number,
                        default: 0
                    } // QTY Order
                }],
            shipping: {
                id: String,
                label: String,
                address: Boolean,
                total_ht: {
                    type: Number,
                    default: 0
                }
            }
        }],
    weight: {type: Number, default: 0}, // Poids total
    lines: [{
            //pu: {type: Number, default: 0},
            qty: {
                type: Number,
                default: 0
            },
            qty_deliv: {type: Number, default: 0}, // Quantity already delivery
            tva_tx: {
                type: Number,
                default: 0
            },
            //price_base_type: String,
            /*group: {
                type: String,
                default: "GLOBAL",
                uppercase: true,
                trim: true
            },*/
            //title: String,
            priceSpecific: {type: Boolean, default: false},
            pu_ht: {
                type: Number,
                default: 0
            },
            description: String,
            private : String, // Private note
            product_type: String,
            product: {
                id: {
                    type: Schema.Types.ObjectId,
                    ref: "product"
                },
                name: {
                    type: String
                },
                label: String,
                dynForm: String
                        // family: {type: String, uppercase: true, default: "OTHER"}
            },
            total_tva: {
                type: Number,
                default: 0
            },
            total_ttc: {
                type: Number,
                default: 0
            },
            discount: {
                type: Number,
                default: 0
            },
            //total_ht_without_discount: {type: Number, default: 0},
            //total_ttc_without_discount: {type: Number, default: 0},
            //total_vat_without_discount: {type: Number, default: 0},
            total_ht: {
                type: Number,
                default: 0,
                set: setPrice
            },
            weight: {type: Number, default: 0},
            optional: {type: Schema.Types.Mixed}
        }],
    history: [{
            date: {type: Date, default: Date.now},
            author: {
                id: String,
                name: String
            },
            mode: String, //email, order, alert, new, ...
            Status: String,
            msg: String
        }]
}, {
    toObject: {virtuals: true},
    toJSON: {virtuals: true}
});

orderSchema.plugin(timestamps);

if (CONFIG('storing-files')) {
    var gridfs = INCLUDE('_' + CONFIG('storing-files'));
    orderSchema.plugin(gridfs.pluginGridFs, {
        root: 'Commande'
    });
}

// Gets listing
orderSchema.statics.query = function (options, callback) {
    var self = this;

    // options.search {String}
    // options.category {String}
    // options.page {String or Number}
    // options.max {String or Number}
    // options.id {String}

    options.page = U.parseInt(options.page) - 1;
    options.max = U.parseInt(options.max, 20);
    if (options.id && typeof (options.id) === 'string')
        options.id = options.id.split(',');
    if (options.page < 0)
        options.page = 0;
    var take = U.parseInt(options.max);
    var skip = U.parseInt(options.page * options.max);

    var query = options.query;
    if(!query.isremoved)
        query.isremoved = {$ne :true};

    //if (options.search)
    //    builder.in('search', options.search.keywords(true, true));
    if (options.id) {
        if (typeof options.id === 'object')
            options.id = {'$in': options.id};
        query._id = options.id;
    }
    
    var sort = "ref";

    if (options.sort)
        sort = options.sort;

    //console.log(query);

    this.find(query)
            .select(options.fields)
            .limit(take)
            .skip(skip)
            //.populate('category', "_id path url linker name")
            .sort(sort)
            //.lean()
            .exec(function (err, doc) {
                //console.log(doc);
                var data = {};
                data.count = doc.length;
                data.items = doc;
                data.limit = options.max;
                data.pages = Math.ceil(data.count / options.max);

                if (!data.pages)
                    data.pages = 1;
                data.page = options.page + 1;
                callback(null, data);
            });
};

/**
 * Pre-save hook
 */
orderSchema.pre('save', function (next) {
    var self = this;
    var SeqModel = MODEL('Sequence').Schema;
    var EntityModel = MODEL('entity').Schema;

    if (this.isNew) {
        this.history = [];
    }
    
    MODULE('utils').sumTotal(this.lines, this.shipping, this.discount, this.client.id, function (err, result) {
         if(err)
            return next(err);
        
        self.total_ht = result.total_ht;
        self.total_tva = result.total_tva;
        self.total_ttc = result.total_ttc;
        self.weight = result.weight;
    
    if (self.isNew && !self.ref) {
        SeqModel.inc("CO", function (seq) {
            //console.log(seq);
            EntityModel.findOne({
                _id: self.entity
            }, "cptRef", function (err, entity) {
                if (err)
                    console.log(err);

                /*if (entity && entity.cptRef)
                    self.ref = "CO" + entity.cptRef + seq;
                else*/
                    self.ref = "CO" + seq;
                next();
            });
        });
    } else {
        if(self.date_livraison)
            self.ref = F.functions.refreshSeq(self.ref, self.date_livraison);

        next();
    }
    });
});

var statusList = {};
Dict.dict({
    dictName: "fk_order_status",
    object: true
}, function (err, docs) {
    statusList = docs;
});

/**
 * Methods
 */
orderSchema.virtual('status')
        .get(function () {
            var res_status = {};

            var status = this.Status;

            if (status && statusList.values[status].label) {
                res_status.id = status;
                res_status.name = i18n.t("orders:" + statusList.values[status].label);
                //this.status.name = statusList.values[status].label;
                res_status.css = statusList.values[status].cssClass;
            } else { // By default
                res_status.id = status;
                res_status.name = status;
                res_status.css = "";
            }

            return res_status;
        });

exports.Schema = mongoose.model('order', orderSchema, 'Commande');
exports.name = "order";