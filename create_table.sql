CREATE TABLE myanimelist
  ( 
     title    VARCHAR(100) NOT NULL PRIMARY KEY, 
     rating     DECIMAL(6,0), 
     popularity    DECIMAL(6,0), 
     score    DECIMAL(2,2), 
     status      VARCHAR(50),
     premiered   VARCHAR(20)
  );
