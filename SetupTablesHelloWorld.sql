DROP TABLE IF EXISTS Demo;
CREATE TABLE Demo (DemoID SERIAL PRIMARY KEY,
                        Name VARCHAR(255) NOT NULL UNIQUE,
                        Message VARCHAR(255)
);
