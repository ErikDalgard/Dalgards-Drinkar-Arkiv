-- Initial catalog, copied from the original spirits.js. Drink records stay unchanged.
CREATE TABLE spirits (
  name TEXT PRIMARY KEY COLLATE NOCASE,
  synonyms TEXT NOT NULL,
  position INTEGER NOT NULL
);

INSERT INTO spirits (name, synonyms, position) VALUES ('Vodka', '["vodka", "vaniljvodka", "citronvodka", "citrongräsinfluerad vodka"]', 0);
INSERT INTO spirits (name, synonyms, position) VALUES ('Gin', '["gin", "london dry gin", "old tom gin", "sloe gin", "rejmyregin", "westerviks gin", "rönnbärsgin"]', 1);
INSERT INTO spirits (name, synonyms, position) VALUES ('Ljus Rom', '["ljus rom", "vit rom"]', 2);
INSERT INTO spirits (name, synonyms, position) VALUES ('Mörk Rom', '["mörk rom", "demarara rom", "demerara rom"]', 3);
INSERT INTO spirits (name, synonyms, position) VALUES ('Tequila', '["tequila", "mezcal"]', 4);
INSERT INTO spirits (name, synonyms, position) VALUES ('Whiskey', '["whiskey", "bourbon", "rågwhiskey", "rye", "scotch", "skotsk blended whiskey", "fireball"]', 5);
INSERT INTO spirits (name, synonyms, position) VALUES ('Cognac', '["cognac", "konjak", "brandy"]', 6);
INSERT INTO spirits (name, synonyms, position) VALUES ('Calvados', '["calvados"]', 7);
INSERT INTO spirits (name, synonyms, position) VALUES ('Limoncello', '["limoncello"]', 8);
INSERT INTO spirits (name, synonyms, position) VALUES ('Aperitif & Bitter', '["campari", "carmpano bitter", "aperol", "gammel dansk", "dubonnet", "fernet branca", "lillet", "kina lillet"]', 9);
INSERT INTO spirits (name, synonyms, position) VALUES ('Vermouth', '["vermouth", "vermuth", "röd vermouth", "söt vermouth", "torr vermouth"]', 10);
