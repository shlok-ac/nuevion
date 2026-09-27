CREATE CONSTRAINT complaint_id_unique IF NOT EXISTS
FOR (c:Complaint)
REQUIRE c.id IS UNIQUE;

CREATE CONSTRAINT account_number_unique IF NOT EXISTS
FOR (a:Account)
REQUIRE a.account_number IS UNIQUE;

CREATE CONSTRAINT transaction_id_unique IF NOT EXISTS
FOR (t:Transaction)
REQUIRE t.transaction_id IS UNIQUE;

CREATE CONSTRAINT bank_name_unique IF NOT EXISTS
FOR (b:Bank)
REQUIRE b.name IS UNIQUE;

CREATE CONSTRAINT location_name_unique IF NOT EXISTS
FOR (l:Location)
REQUIRE l.name IS UNIQUE;