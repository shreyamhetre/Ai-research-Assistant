import psycopg2
import numpy as np
from config import Config
import traceback

def generate_random_embedding(dim=384):
    """Generate a random vector embedding of specified dimension."""
    return np.random.rand(dim).tolist()

def list_all_tables():
    """List all tables in the connected PostgreSQL database."""
    try:
        config_data = Config()
        print(config_data.PG_DATABASE)
        # Establish connection
        conn = psycopg2.connect(
            host=Config.PG_HOST,
            port=Config.PG_PORT,
            database=Config.PG_DATABASE,
            user=Config.PG_USER,
            password=Config.PG_PASSWORD
        )

        # Create a cursor
        with conn.cursor() as cursor:
            # Query to list all tables
            cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public';
            """)

            tables = cursor.fetchall()
            print("\nList of Tables in the Database:")
            for table in tables:
                print(f"- {table[0]}")

    except psycopg2.Error as e:
        print(f"\n PostgreSQL Error: {e}")
        traceback.print_exc()
    except Exception as e:
        print(f"\n Unexpected Error: {e}")
        traceback.print_exc()
    finally:
        if conn:
            conn.close()

def test_db_connection_and_insert():
    try:
        
        # Establish connection
        conn = psycopg2.connect(
            host=Config.PG_HOST,
            port=Config.PG_PORT,
            database=Config.PG_DATABASE,
            user=Config.PG_USER,
            password=Config.PG_PASSWORD
        )
        
        # Create a cursor
        with conn.cursor() as cursor:
            # Prepare sample data
            test_data = [
                {
                    'title': 'Sample Document 1',
                    'content': 'This is the first test document for vector database.',
                    'embedding': generate_random_embedding()
                },
                {
                    'title': 'Sample Document 2',
                    'content': 'This is the second test document for vector database.',
                    'embedding': generate_random_embedding()
                }
            ]

            # Insert sample data
            insert_query = """
            INSERT INTO data (title, content, embedding) 
            VALUES (%s, %s, %s) 
            RETURNING id;
            """
            
            inserted_ids = []
            for item in test_data:
                cursor.execute(insert_query, (
                    item['title'], 
                    item['content'], 
                    item['embedding']
                ))
                inserted_id = cursor.fetchone()[0]
                inserted_ids.append(inserted_id)
                print(f"Inserted document with ID: {inserted_id}")

            # Commit the transaction
            conn.commit()

            # Verify insertion by querying
            cursor.execute("SELECT id, title, content FROM data WHERE id IN %s;", (tuple(inserted_ids),))
            inserted_records = cursor.fetchall()
            
            print("\nInserted Records:")
            for record in inserted_records:
                print(f"ID: {record[0]}, Title: {record[1]}, Content: {record[2]}")

            # Count total records
            cursor.execute("SELECT COUNT(*) FROM data;")
            total_records = cursor.fetchone()[0]
            print(f"\nTotal records in data table: {total_records}")

        print("\n✅ Database connection and insertion successful!")

    except psycopg2.Error as e:
        print(f"\n PostgreSQL Error: {e}")
        traceback.print_exc()
    except Exception as e:
        print(f"\n Unexpected Error: {e}")
        traceback.print_exc()
    finally:
        if conn:
            conn.close()

# Run the test
if __name__ == "__main__":
    # list_all_tables()
    test_db_connection_and_insert()
