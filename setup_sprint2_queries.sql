-- Create Global Chat room, ChatId6
INSERT INTO
	chats(chatid, name)
VALUES
	(11, 'sprint2 chat2')
RETURNING *;

-- Add Brandon & Charles as Friend
INSERT INTO
	Contacts(PrimaryKey, MemberId_A, MemberId_B, Verified)
VALUES
	(DEFAULT, 65, (SELECT MemberId FROM Members WHERE Email='cfb3@uw.edu'), 1)
RETURNING *;


-- Add Users into ChatId6
INSERT INTO
	ChatMembers(ChatId, MemberId)
VALUES 
	(11, 65),
	(11, (SELECT MemberId FROM Members WHERE Email='cfb3@uw.edu'))
RETURNING *;

--Add an initial message
INSERT INTO
	Messages(PrimaryKey, ChatId, Message, MemberId)
VALUES
	(DEFAULT, 11, '', 65);