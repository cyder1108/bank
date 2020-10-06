"use strict";

const _ = require(`lodash`);
const EventEmitter = require("events").EventEmitter;

class Collection extends EventEmitter {
  constructor( schema, collections = [], parent = null ) {
    super()
    this.schema = schema;
    this.schema.id = { type: "string", require: true, unique: true };
    this.__collections = collections;
    this.parent = parent
    this.Model = Model;
    this.errors = [];
    this.virtual = {
      setter: {},
      getter: {},
    };
    this.filters = {
      beforeSet: {},
      beforeGet: {},
      beforeValidate: [],
    }
    this.errorMessage = {
      duplicate: "__KEY__ is duplicated.",
      notPresent: "__KEY__ is required.",
      invalid: "__KEY__ is invalid.",
      typeMismatch: "__KEY__ is mismatched type.",
    }
    if( this.parent !== null) {
      this.scopes = this.parent.scopes;
    } else {
      this.scopes = {};
    }
    this.init();
  }

  init() {}

  find( search ) {
    if( typeof(search) === "string") {
      var matches = this.where({id: search});
    } else {
      var matches = this.where(search)
    }
    if( matches.length === 0 ) {
      return void(0)
    } else {
      return matches.at(0);
    }
  }

  at( number ) {
    return this.__collections[number]
  }

  where( attr ) {
    return new this.constructor( this.schema, this.__collections.filter( m => {
      var result = true;
      Object.keys( attr ).forEach( key => {
        if( m.get(key) !== attr[key] ) {
          result = false
          return false
        }
      })
      return result;
    }), this);
  }

  filter( callback ) {
    return new this.constructor( this.schema, this.__collections.filter( m => callback(m) ), this);
  }

  sort( order ="ASC", arg) {
    order = order.toUpperCase()
    if( order === "ASC") {
      return new this.constructor( this.schema, _.sortBy( this.__collections, arg ), this );
    } else {
      return new this.constructor( this.schema, _.reverse( _.sortBy( this.__collections, arg )), this );
    }
  }

  reverse() {
    return new this.constructor( this.schema, _.reverse(this.__collections), this);
  }

  all() {
    return this.__collections;
  }

  scope(name, callback) {
    this.scopes[name] = callback
    return this;
  }

  with(name, ...args) {
    if( this.scopes[name] === void(0)) {
      throw new Error(`${name} scope is not defined.`)
    }
    return this.scopes[name]( this, ...args );
  }

  each( callback ) {
    _.each( this.__collections, m => { callback(m) } )
    return this;
  }

  map( callback ) {
    return _.map( this.__collections, m => { callback(m) } )
  }

  count() {
    return this.all().length
  }


  removeAll() {
    while( this.__collections.length > 0) {
      this.remove( this.at(0) )
    }
    this.emit("afterRemoveAll", this);
    return this;
  }

  remove( model ) {
    _.remove( this.__collections, m => m.get("id") === model.get("id"));
    if( this.parent !== null ) {
      this.parent.remove( model )
      this.emit("afterRemove", this);
    }
    return this
  }

  create( attr = {}) {
    const model = this.new(attr)
    return this.save( model );
  }

  new( attr = {} ) {
    const model = new this.Model( this.schema);
    model.filters = this.filters;
    model.virtual = this.virtual;
    model.setAttributes( attr );
    return model;
  }

  save( model ) {
    if( this.parent !== null ) return this.parent.save(model);
    model.errors = [];
    this.filters.beforeValidate.forEach( _filter=> _filter(model) )
    if( !this.valid( model )) return false;
    if( this.find( model.get("id") ) === void(0) ){
      this.__collections.push( _.cloneDeep(model) );
      this.emit("afterCreate", model, this);
    } else {
      const target = _.find( this.__collections, m => m.get("id") === model.get("id") );
      target.__attributes = _.cloneDeep( model.__attributes );
      this.emit("afterUpdate", model, this);
    }
    this.emit("afterSave", model, this);
    return true;
  }

  valid( model ) {
    this.errors = [];
    this.checkPresence(model);
    this.checkType(model);
    this.checkUniqueness(model);
    this.checkValidate(model);
    this.errors = _.merge( this.errors, model.errors );
    if( this.errors.length > 0) return false;
    return true
  }

  beforeSet(key, callback) {
    if( this.filters.beforeSet[key] === void(0)) {
      this.filters.beforeSet[key] = [];
    }
    this.filters.beforeSet[key].push( callback );
  }

  beforeValidate( callback ) {
    this.filters.beforeValidate.push( callback );
  }

  beforeGet(key, callback) {
    if( this.filters.beforeGet[key] === void(0)) {
      this.filters.beforeGet[key] = [];
    }
    this.filters.beforeGet[key].push( callback );
  }

  virtualSet( key, callback ) {
    this.virtual.setter[key] = callback;
    return this;
  }

  virtualGet( key, callback ) {
    this.virtual.getter[key] = callback;
    return this;
  }

  checkType( model) {
    Object.keys( this.schema ).forEach( key => {
      if( model.attrRead(key) !== null && this.schema[key].type !== typeof( model.attrRead(key) ) ) {
        model.addError( key, this.errorMessage.typeMismatch )
      }
    })
  }

  checkUniqueness( model ) {
    Object.keys( this.schema ).forEach( key => {
      if( this.schema[key].unique !== void(0) && this.schema[key].unique ) {
        const dups = this.filter( m => {
          if( m.attrRead("id") === model.attrRead("id") ) return false;
          return m.attrRead(key) === model.attrRead(key);
        })
        if( dups.count() > 0 ) {
          model.addError( key, this.errorMessage.duplicate )
        }
      }
    });
  }

  checkPresence( model ) {
    Object.keys( this.schema ).forEach( key => {
      if( this.schema[key].require !== void(0) && this.schema[key].require ) {
        if( model.attrRead(key) === null ) {
          model.addError( key, this.errorMessage.notPresent )
        }
      }
    })
  }

  checkValidate( model ) {
    Object.keys( this.schema ).forEach( key => {
      if( this.schema[key].validate !== void(0) && model.attrRead(key) !== null) {
        if( !this.schema[key].validate( model.attrRead(key), model ) ) {
          model.addError( key, this.errorMessage.invalid );
        }
      }
    });
  }

  toArray() {
    return this.__collections.map( m => m.toObject() )
  }
}

class Model {
  constructor( schema, attr = {} ) {
    this.schema = schema;
    this.errors = []
    this.__attributes = {};
    this.filters = {
      beforeSet: {},
      beforeGet: {},
    }
    Object.keys( this.schema ).forEach( key => {
      if( this.schema[key].default !== void(0)  ) {
        this.__attributes[key] = this.schema[key].default;
      } else {
        this.__attributes[key] = null;
      }
    });
    this.__attributes.id = this.__createID()
    this.init();
    this.setAttributes( attr );
  }

  init() {}

  get( key ) {
    if( this.virtual.getter[key] !== void(0) ) {
      return this.virtual.getter[key](this);
    }
    var val = this.attrRead(key);
    if( this.filters.beforeGet[key] !== void(0)) {
      this.filters.beforeGet[key].forEach( filter => {
        val = filter( val, key, this );
      })
    }
    return val;
  }

  set( key, val ) {
    if( this.virtual.setter[key] !== void(0) ) {
      return this.virtual.setter[key](this, val);
    }
    if( this.filters.beforeSet[key] !== void(0)) {
      this.filters.beforeSet[key].forEach( filter => {
        val = filter( val, key, this );
      })
    }
    return this.attrWrite(key,val);
  }

  attrRead( key ) {
    return _.cloneDeep( this.__attributes[key] )
  }

  attrWrite( key, val ) {
    this.__attributes[key] = val;
    return true
  }

  setAttributes( attr ) {
    var result = true;
    const beforeAttributes = _.cloneDeep( this.__attributes );
    Object.keys( attr ).forEach( key => {
      if( !this.set(key, attr[key]) ) {
        result = false;
      }
    });
    if( !result ) {
      this.__attributes = beforeAttributes;
    }
    return result;
  }

  addError( key, message ) {
    this.errors.push( new ModelError(this,key,message) );
  }

  toObject() {
    return _.cloneDeep( this.__attributes );
  }

  toJSON() {
    return JSON.stringify( this.toObject() );
  }

  __createID() {
    var str = "abcdefghyjklmnopqrstuvwxyz";
    str += str.toUpperCase();
    str += "0123456789";
    var id = "";
    for( var i =0; i< 10; i++) {
      id += str[Math.floor( Math.random() * str.length )];
    }
    return `${ +new Date }${id}`;
  }

}

class ModelError {
  constructor( model, key, message ) {
    this.model = model;
    this.key   = key;
    this.message = message;
  }

  toMessage() {
    return this.message.replace(/__KEY__/g, this.key)
  }
}

module.exports = { Collection, Model }
