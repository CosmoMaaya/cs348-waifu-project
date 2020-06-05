CREATE TABLE myanimelist
  ( 
     title    VARCHAR(255) NOT NULL PRIMARY KEY, 
     rating     DECIMAL(6,0), 
     popularity    DECIMAL(6,0), 
     score    DECIMAL(4,2), 
     status      VARCHAR(50),
     premiered   VARCHAR(20)
  );
