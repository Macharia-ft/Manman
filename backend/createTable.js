
require("dotenv").config({ path: "./backend/.env" });
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createUsersTable() {
  try {
    console.log('Creating users table...');
    
    // SQL to create the users table
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          current_step VARCHAR(50) DEFAULT 'identity',
          status VARCHAR(50) DEFAULT 'pending',
          admin_message TEXT,
          full_name VARCHAR(255),
          national_id_number VARCHAR(100),
          dob DATE,
          gender VARCHAR(50),
          orientation VARCHAR(50),
          country_of_birth VARCHAR(100),
          country_of_residence VARCHAR(100),
          county_of_residence VARCHAR(100),
          willing_to_relocate VARCHAR(20),
          languages TEXT[],
          preferred_language VARCHAR(50),
          education VARCHAR(100),
          occupation VARCHAR(255),
          employment_type VARCHAR(100),
          religion VARCHAR(100),
          religion_importance VARCHAR(50),
          marital_status VARCHAR(50),
          children_count INTEGER,
          wants_children VARCHAR(20),
          height INTEGER,
          weight INTEGER,
          body_type VARCHAR(50),
          skin_color VARCHAR(50),
          ethnicity VARCHAR(100),
          diet VARCHAR(50),
          smoking VARCHAR(20),
          drinking VARCHAR(20),
          exercise VARCHAR(50),
          pets VARCHAR(50),
          living_situation VARCHAR(100),
          relationship_type VARCHAR(50),
          hobbies TEXT,
          interests TEXT,
          bio TEXT,
          photo_url TEXT,
          liveness_video_url TEXT,
          id_front_url TEXT,
          id_back_url TEXT,
          profile_photo_url TEXT,
          profile_video_url TEXT,
          national_id_url TEXT,
          selfie_url TEXT,
          is_complete BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          pref_gender VARCHAR(50),
          pref_age_min INTEGER,
          pref_age_max INTEGER,
          pref_country_of_birth VARCHAR(100),
          pref_country_of_residence VARCHAR(100),
          pref_county_of_residence VARCHAR(100),
          pref_country VARCHAR(100),
          pref_languages TEXT[],
          pref_religion VARCHAR(100),
          pref_religion_importance VARCHAR(50),
          pref_height INTEGER,
          pref_weight INTEGER,
          pref_body_type VARCHAR(50),
          pref_skin_color VARCHAR(50),
          pref_ethnicity VARCHAR(100),
          pref_diet VARCHAR(50),
          pref_smoking VARCHAR(20),
          pref_drinking VARCHAR(20),
          pref_exercise VARCHAR(50),
          pref_pets VARCHAR(50),
          pref_children VARCHAR(20),
          pref_living_situation VARCHAR(100),
          pref_willing_to_relocate VARCHAR(20),
          pref_relationship_type VARCHAR(50)
        );`
    });
    
    if (error) {
      console.error('❌ Error creating table with RPC:', error);
      console.log('\n🔧 Please create the table manually in your Supabase dashboard using this SQL:');
      console.log(`
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  current_step VARCHAR(50) DEFAULT 'identity',
  status VARCHAR(50) DEFAULT 'pending',
  admin_message TEXT,
  full_name VARCHAR(255),
  national_id_number VARCHAR(100),
  dob DATE,
  gender VARCHAR(50),
  orientation VARCHAR(50),
  country_of_birth VARCHAR(100),
  country_of_residence VARCHAR(100),
  county_of_residence VARCHAR(100),
  willing_to_relocate VARCHAR(20),
  languages TEXT[],
  preferred_language VARCHAR(50),
  education VARCHAR(100),
  occupation VARCHAR(255),
  employment_type VARCHAR(100),
  religion VARCHAR(100),
  religion_importance VARCHAR(50),
  marital_status VARCHAR(50),
  children_count INTEGER,
  wants_children VARCHAR(20),
  height INTEGER,
  weight INTEGER,
  body_type VARCHAR(50),
  skin_color VARCHAR(50),
  ethnicity VARCHAR(100),
  diet VARCHAR(50),
  smoking VARCHAR(20),
  drinking VARCHAR(20),
  exercise VARCHAR(50),
  pets VARCHAR(50),
  living_situation VARCHAR(100),
  relationship_type VARCHAR(50),
  hobbies TEXT,
  interests TEXT,
  bio TEXT,
  photo_url TEXT,
  liveness_video_url TEXT,
  id_front_url TEXT,
  id_back_url TEXT,
  profile_photo_url TEXT,
  profile_video_url TEXT,
  national_id_url TEXT,
  selfie_url TEXT,
  is_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  pref_gender VARCHAR(50),
  pref_age_min INTEGER,
  pref_age_max INTEGER,
  pref_country_of_birth VARCHAR(100),
  pref_country_of_residence VARCHAR(100),
  pref_county_of_residence VARCHAR(100),
  pref_country VARCHAR(100),
  pref_languages TEXT[],
  pref_religion VARCHAR(100),
  pref_religion_importance VARCHAR(50),
  pref_height INTEGER,
  pref_weight INTEGER,
  pref_body_type VARCHAR(50),
  pref_skin_color VARCHAR(50),
  pref_ethnicity VARCHAR(100),
  pref_diet VARCHAR(50),
  pref_smoking VARCHAR(20),
  pref_drinking VARCHAR(20),
  pref_exercise VARCHAR(50),
  pref_pets VARCHAR(50),
  pref_children VARCHAR(20),
  pref_living_situation VARCHAR(100),
  pref_willing_to_relocate VARCHAR(20),
  pref_relationship_type VARCHAR(50)
);
      `);
      
    } else {
      console.log('✅ Users table created successfully!');
    }
    
  } catch (err) {
    console.error('❌ Error:', err);
    console.log('Please create the users table manually in your Supabase dashboard.');
  }
}

createUsersTable();
