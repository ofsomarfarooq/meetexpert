-- Create Database
CREATE TABLE skills (
skill_id INT AUTO_INCREMENT PRIMARY KEY,
skill_name VARCHAR(100) NOT NULL UNIQUE
);


-- User Skills Mapping
CREATE TABLE user_skills (
user_id INT,
skill_id INT,
PRIMARY KEY (user_id, skill_id),
FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
FOREIGN KEY (skill_id) REFERENCES skills(skill_id) ON DELETE CASCADE
);


-- Expert Profiles
CREATE TABLE expert_profiles (
expert_id INT PRIMARY KEY,
bio TEXT,
price_per_chat DECIMAL(10,2) DEFAULT 0.00,
overall_rating FLOAT DEFAULT 0,
FOREIGN KEY (expert_id) REFERENCES users(user_id) ON DELETE CASCADE
);


-- Subscriptions
CREATE TABLE subscriptions (
subscription_id INT AUTO_INCREMENT PRIMARY KEY,
seeker_id INT,
expert_id INT,
start_date DATE DEFAULT (CURRENT_DATE),
end_date DATE,
amount_paid DECIMAL(10,2) NOT NULL,
FOREIGN KEY (seeker_id) REFERENCES users(user_id) ON DELETE CASCADE,
FOREIGN KEY (expert_id) REFERENCES users(user_id) ON DELETE CASCADE
);


-- Posts
CREATE TABLE posts (
post_id INT AUTO_INCREMENT PRIMARY KEY,
user_id INT,
title VARCHAR(200),
content TEXT,
visibility ENUM('public','subscribers') DEFAULT 'public',
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);


-- Chats
CREATE TABLE chats (
chat_id INT AUTO_INCREMENT PRIMARY KEY,
subscription_id INT,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (subscription_id) REFERENCES subscriptions(subscription_id) ON DELETE CASCADE
);


-- Messages
CREATE TABLE messages (
message_id INT AUTO_INCREMENT PRIMARY KEY,
chat_id INT,
sender_id INT,
content TEXT,
timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (chat_id) REFERENCES chats(chat_id) ON DELETE CASCADE,
FOREIGN KEY (sender_id) REFERENCES users(user_id) ON DELETE CASCADE
);


-- Ratings
CREATE TABLE ratings (
rating_id INT AUTO_INCREMENT PRIMARY KEY,
seeker_id INT,
expert_id INT,
rating_value INT CHECK (rating_value BETWEEN 1 AND 5),
review TEXT,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (seeker_id) REFERENCES users(user_id) ON DELETE CASCADE,
FOREIGN KEY (expert_id) REFERENCES users(user_id) ON DELETE CASCADE
);


-- Notifications
CREATE TABLE notifications (
notif_id INT AUTO_INCREMENT PRIMARY KEY,
user_id INT,
type VARCHAR(50),
message TEXT,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
