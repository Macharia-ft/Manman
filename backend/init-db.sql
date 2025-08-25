
-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    dob DATE,
    gender VARCHAR(50),
    country_of_birth VARCHAR(255),
    languages TEXT[],
    religion VARCHAR(100),
    height INTEGER,
    weight INTEGER,
    body_type VARCHAR(100),
    skin_color VARCHAR(100),
    ethnicity VARCHAR(100),
    diet VARCHAR(100),
    smoking VARCHAR(50),
    drinking VARCHAR(50),
    exercise VARCHAR(100),
    pets VARCHAR(100),
    children VARCHAR(100),
    living_situation VARCHAR(255),
    willing_to_relocate BOOLEAN,
    profile_photo_url TEXT,
    profile_video_url TEXT,
    national_id_number VARCHAR(255),
    pref_gender VARCHAR(50),
    pref_age_min INTEGER,
    pref_age_max INTEGER,
    pref_country VARCHAR(255),
    pref_languages TEXT[],
    pref_religion VARCHAR(100),
    pref_height INTEGER,
    pref_weight INTEGER,
    pref_body_type VARCHAR(100),
    pref_skin_color VARCHAR(100),
    pref_ethnicity VARCHAR(100),
    pref_diet VARCHAR(100),
    pref_smoking VARCHAR(50),
    pref_drinking VARCHAR(50),
    pref_exercise VARCHAR(100),
    pref_pets VARCHAR(100),
    pref_children VARCHAR(100),
    pref_living_situation VARCHAR(255),
    pref_willing_to_relocate BOOLEAN,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_interactions table
CREATE TABLE IF NOT EXISTS user_interactions (
    id SERIAL PRIMARY KEY,
    current_user_id INTEGER REFERENCES users(id),
    selected_user_id INTEGER REFERENCES users(id),
    action VARCHAR(50) CHECK (action IN ('selected', 'accepted', 'rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create admins table
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
