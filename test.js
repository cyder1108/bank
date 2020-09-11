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
  const adults = users.filter( u => 18 <= u.get("age") )
  t.is( adults.count(), 3);
  adults.each( m => t.true(m.get("age") >= 18) )
});


test("sort", t => {
  var users = new Bank.Collection({
    name: { type: "string", require: true},
    age:  { type: "number", require: true, default: 0 },
    sex:  { type: "string", require: true },
  })
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
  })
  users.create({ name: "テスト太郎", age: 25, sex: "male" });
  users.create({ name: "テスト花子", age: 24, sex: "female" });
  users.create({ name: "テスト五郎", age: 50, sex: "male" });
  users.create({ name: "検証幸子",   age: 13, sex: "female" });
  users.scope("ageRange", ( collections ,min, max ) => {
    return collections.filter( u => min <= u.get("age") && u.get("age") <= max );
  })
  users.scope("female", c => c.where({sex: "female"}));

  const twentyAgers = users.with("ageRange", 20, 29);
  t.is( twentyAgers.count(), 2)

  const femaleTwentyAgers = twentyAgers.with("female");
  t.is( femaleTwentyAgers.count(), 1)
});

test("remove", t => {
  const users = new Bank.Collection({
    name: { type: "string", require: true},
    age:  { type: "number", require: true, default: 0 },
    sex:  { type: "string", require: true },
  })
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
  })
  t.is( users.count(), 0)

  const model = users.new({ name: "テスト太郎", age: 25, sex: "male" })
  t.true( users.save( model ) );
  t.is( users.count(), 1)

  const dupModel = users.new({name: "テスト太郎", age: 80, sex: "male"})
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
})

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
})
