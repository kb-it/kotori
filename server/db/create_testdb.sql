CREATE DATABASE kotori_test ENCODING utf8;
\c kotori_test
\i /tmp/postgres/postgres.sql;

INSERT INTO tag_type(name)
VALUES
    ('track'),
    ('artist'),
    ('title'),
    ('album'),
    ('composer'),
    ('year');

INSERT INTO "user"(mail, password, is_deleted)
VALUES
    ('bestof1950@domain.tld', 'password', 0::BOOLEAN),
    ('bestof1960@domain.tld', '12345', 0::BOOLEAN),
    ('bestof1970@domain.tld', 'p4ss', 0::BOOLEAN),
    ('prankster@domain.tld', 'bugmenot', 1::BOOLEAN),
    ('wisenheimer@domain.tld', '1337', 0::BOOLEAN);

INSERT INTO fingerprint(hash)
VALUES
    ('{{0,0,0,0}}'),
    ('{{1,1,1}}'),
    ('{{2,2}}'),
    ('{{3}}');

INSERT INTO track(id_fingerprint, id_user)
VALUES
    (1, 1),
    (1, 1),
    (2, 1),
    (2, 1),
    (3, 2),
    (4, 2);

INSERT INTO tag(id_track, id_tag_type, id_user, meta, value, revision)
VALUES
    (1, 1, 1, '{}', '1', 1),
    (1, 2, 1, '{}', 'Die Schöneberger Sängerknaba', 1),
    (1, 2, 5, '{}', 'Die Schöneberger Sängerknaben', 2),
    (1, 2, 4, '{}', 'Barbara Schöneberger', 3),
    (1, 2, 5, '{}', 'Die Schöneberger Sängerknaben', 4),
    (1, 2, 4, '{}', 'In the end it doesn''t even matter', 1),
    (1, 3, 1, '{}', 'Die Fischerin vom Bodensee', 2),
    (1, 4, 1, '{}', 'Das waren Schlager 1950', 1),
    (1, 5, 1, '{}', 'Frank Winkel', 1),
    (1, 5, 4, '{}', 'Frank Hinkelstein', 2),
    (1, 5, 5, '{}', 'Franz Winkler', 3),

    (2, 1, 5, '{}', '20', 1),
    (2, 2, 5, '{}', 'Die Schöneberger Sängerknaben', 1),
    (2, 3, 5, '{}', 'Die Fischerin vom Bodensee', 1),
    (2, 4, 5, '{}', 'Die Goldene Schlagerbox der 50er Jahre', 1),
    (2, 5, 5, '{}', 'Franz Winkler', 1),

    (3, 1, 1, '{}', '2', 1),
    (3, 2, 1, '{}', 'Sara Leander', 1),
    (3, 2, 5, '{}', 'Zarah Leander', 2),
    (3, 3, 1, '{}', 'Wenn der Herrgott will', 1),
    (3, 4, 1, '{}', 'Unvergessene Zarah Leander', 1),
    (3, 5, 1, '{}', 'Michael Jary', 1),
    (3, 5, 4, '{}', 'Michael Jackson', 2),
    (3, 5, 5, '{}', 'Michael Jary', 3),
    
    (4, 1, 5, '{}', '12', 1),
    (4, 2, 5, '{}', 'Zarah Leander', 1),
    (4, 3, 5, '{}', 'Wenn der Herrgott will', 1),
    (4, 4, 5, '{}', 'Das waren Schlager 1950', 1),
    (4, 5, 5, '{}', 'Michael Jary', 1),
    
    (5, 1, 2, '{}', '1', 1),
    (5, 2, 2, '{}', 'Ja & Keld', 1),
    (5, 2, 4, '{}', 'Nein, der Held', 2),
    (5, 2, 5, '{}', 'Jan & Kjeld', 3),
    (5, 3, 2, '{}', 'Banjo Boy', 1),
    (5, 4, 2, '{}', 'Banjo Boy', 1),
    (5, 5, 2, '{}', 'Charlie Nassen', 1),
    (5, 5, 4, '{}', 'Charlie und die Schokoladennasenfabrik', 2),
    (5, 5, 5, '{}', 'Charly Niessen', 3),
    
    (6, 1, 2, '{}', '2', 1),
    (6, 2, 2, '{}', 'Heidi Brül', 1),
    (6, 2, 4, '{}', 'Heidi Klum', 2),
    (6, 2, 5, '{}', 'Heidi Brühl', 3),
    (6, 3, 2, '{}', 'Wir wollen niemals auseinandergehn', 1),
    (6, 4, 2, '{}', 'Schlagerjuwelen - Ihre großen Erfolge', 1),
    (6, 5, 2, '{}', 'Michael Jary', 1),
    (6, 5, 4, '{}', 'Michael Jackson', 2),
    (6, 5, 2, '{}', 'Michael Jary', 3);


