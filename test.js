const test = require(`ava`);

const Bank = require(`./`);

test("find", t => {
  const users = new Bank.Collection({
    name: { type: "string", require: true},
    age:  { type: "number", require: true, default: 0 },
    sex:  { type: "string", require: true },
  })
  users.create({ name: "テスト太郎", age: 25, sex: "male" });
  users.create({ name: "テスト花子", age: 24, sex: "female" });
  users.create({ name: "テスト五郎", age: 50, sex: "male" });
  users.create({ name: "検証幸子",   age: 13, sex: "female" });
  const tarou = users.find({name: "テスト太郎"});
  t.is( tarou.get("age"), 25 );
});

test("where", t => {
  const users = new Bank.Collection({
    name: { type: "string", require: true},
    age:  { type: "number", require: true, default: 0 },
    sex:  { type: "string", require: true },
  })
  users.create({ name: "テスト太郎", age: 25, sex: "male" });
  users.create({ name: "テスト花子", age: 24, sex: "female" });
  users.create({ name: "テスト五郎", age: 50, sex: "male" });
  users.create({ name: "検証幸子",   age: 13, sex: "female" });
  const males = users.where({sex: "male"});
  t.is( males.count(), 2 );
  males.each( m => t.is(m.get("sex"), "male"));
});

test("filter", t => {
  const users = new Bank.Collection({
    name: { type: "string", require: true},
    age:  { type: "number", require: true, default: 0 },
    sex:  { type: "string", require: true },
  })
  users.create({ name: "テスト太郎", age: 25, sex: "male" });
  users.create({ name: "テスト花子", age: 24, sex: "female" });
  users.create({ name: "テスト五郎", age: 50, sex: "male" });
  users.create({ name: "検証幸子",   age: 13, sex: "female" });
  const adults = users.filter( u => 18 <= u.get("age") );
  t.is( adults.count(), 3);
  adults.each( m => t.true(m.get("age") >= 18) );
});


test("sort", t => {
  var users = new Bank.Collection({
    name: { type: "string", require: true},
    age:  { type: "number", require: true, default: 0 },
    sex:  { type: "string", require: true },
  });
  users.create({ name: "テスト太郎", age: 25, sex: "male" });
  users.create({ name: "テスト花子", age: 24, sex: "female" });
  users.create({ name: "テスト五郎", age: 50, sex: "male" });
  users.create({ name: "検証幸子",   age: 13, sex: "female" });
  users = users.sort("ASC", u => u.get("age") );
  var beforeAge = 0;
  users.each( u => {
    t.true( u.get("age") >= beforeAge );
    beforeAge = u.get("age")
  })

  users = users.sort("DESC", u => u.get("age") );
  beforeAge = 1000;
  users.each( u => {
    t.true( u.get("age") <= beforeAge );
    beforeAge = u.get("age")
  })

  users = users.reverse();
  beforeAge = 0;
  users.each( u => {
    t.true( u.get("age") >= beforeAge );
    beforeAge = u.get("age")
  })
});

test("scope", t => {
  const users = new Bank.Collection({
    name: { type: "string", require: true},
    age:  { type: "number", require: true, default: 0 },
    sex:  { type: "string", require: true },
  });
  users.create({ name: "テスト太郎", age: 25, sex: "male" });
  users.create({ name: "テスト花子", age: 24, sex: "female" });
  users.create({ name: "テスト五郎", age: 50, sex: "male" });
  users.create({ name: "検証幸子",   age: 13, sex: "female" });
  users.scope("ageRange", ( collections ,min, max ) => {
    return collections.filter( u => min <= u.get("age") && u.get("age") <= max );
  });
  users.scope("female", c => c.where({sex: "female"}));

  const twentyAgers = users.with("ageRange", 20, 29);
  t.is( twentyAgers.count(), 2);

  const femaleTwentyAgers = twentyAgers.with("female");
  t.is( femaleTwentyAgers.count(), 1);
});

test("remove", t => {
  const users = new Bank.Collection({
    name: { type: "string", require: true},
    age:  { type: "number", require: true, default: 0 },
    sex:  { type: "string", require: true },
  });
  users.create({ name: "テスト太郎", age: 25, sex: "male" });
  users.create({ name: "テスト花子", age: 24, sex: "female" });
  users.create({ name: "テスト五郎", age: 50, sex: "male" });
  users.create({ name: "検証幸子",   age: 13, sex: "female" });
  users.scope("female", c => c.where({sex: "female"}));
  const femaleUsers = users.with("female");
  t.is( femaleUsers.count(), 2)
  femaleUsers.removeAll();
  t.is( users.count(), 2)
});

test("validation", t => {
  const users = new Bank.Collection({
    name: { type: "string", require: true, unique: true},
    age:  { type: "number", require: true, default: 0 },
    sex:  { type: "string", require: true, validate: val => /^(male|female)$/.test(val) },
    power: { type: "number"}
  });
  t.is( users.count(), 0);

  const model = users.new({ name: "テスト太郎", age: 25, sex: "male" });
  t.true( users.save( model ) );
  t.is( users.count(), 1);

  const dupModel = users.new({name: "テスト太郎", age: 80, sex: "male"});
  t.false( users.save( dupModel ) );
  t.is( users.count(), 1);

  const chippedModel = users.new({ name: "テスト花子" });
  t.false( users.save( chippedModel));
  t.is( users.count(), 1);

  const invalidSexModel = users.new({ name: "テスト花子", age: 24, sex: "hoge" });
  t.false( users.save( invalidSexModel));
  t.is( users.count(), 1);

  const invalidTypeModel = users.new({ name: "テスト花子", age: "24", sex: "female" });
  t.false( users.save( invalidTypeModel));
  t.is( users.count(), 1);

  const validModel = users.new({ name: "テスト花子", age: 24, sex: "female" });
  t.true( users.save( validModel));
  t.is( users.count(), 2);
});

test("beforeFilter", t => {
  const users = new Bank.Collection({
    name: { type: "string", require: true, unique: true},
    age:  { type: "number", require: true, default: 0 },
    sex:  { type: "string", require: true, validate: val => /^(male|female)$/.test(val) },
  });
  users.beforeSet("name", val => `${val} 様`);
  users.beforeGet("age", val => `${val} 歳`);

  const model = users.new({ name: "テスト太郎", age: 25, sex: "male" });
  t.true( users.save( model ) );
  t.is( model.get("name"), "テスト太郎 様" );
});


test("update", t => {
  const users = new Bank.Collection({
    name: { type: "string", require: true, unique: true},
    age:  { type: "number", require: true, default: 0 },
    sex:  { type: "string", require: true, validate: val => /^(male|female)$/.test(val) },
  });
  const tarou = users.new({ name: "テスト太郎", age: 25, sex: "male" });
  users.save( tarou );
  users.create({ name: "テスト花子", age: 24, sex: "female" });
  t.is( users.count(), 2)
  t.is( users.find(tarou.get("id")).get("age"), 25)

  tarou.set("age", 28);
  t.is( users.count(), 2)
  t.is( users.find(tarou.get("id")).get("age"), 25)


  users.save( tarou )
  t.is( users.count(), 2)
  t.is( users.find(tarou.get("id")).get("age"), 28)
})

test("virtual", t => {
  const users = new Bank.Collection({
    name: { type: "string", require: true},
    age:  { type: "number", require: true, default: 0 },
    sex:  { type: "string", require: true },
  })

  users.virtualGet("pname", m => {
    return `${m.get("name")}(${m.get("age")})`
  })

  users.virtualSet("pname", ( m, val ) => {
    const vals = val.split("(").map( v => v.replace(/\)$/,"") );
    m.set("name", vals[0]);
    m.set("age", +vals[1]);
  })


  users.create({ name: "テスト太郎", age: 25, sex: "male" });
  const user = users.at(0);
  t.is( user.get("name"), "テスト太郎");
  t.is( user.get("pname"), "テスト太郎(25)" );

  user.set(`pname`, "山田太郎(30)");
  t.is( user.get("name"), "山田太郎" )
  t.is( user.get("age"), 30 )

});

test("addError", t => {
  const users = new Bank.Collection({
    name: { type: "string", require: true },
    age:  { type: "number", require: true },
    sex:  { type: "string", require: true },
  })
  users.beforeValidate( m => {
    if( m.get("age") === null ) return
    if( m.get("age") < 18 ) {
      m.addError("age", "未成年です。")
    }
  })

  user = users.new( { age: 12, sex: "male" } );
  t.false( users.save( user ) )
  console.log( users.errors.map( e => e.toMessage() ) );
  user.set("age", 18);
  t.true( users.save( user ) )
  t.pass();
});
