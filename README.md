# DB Docs Generator  
Generate your DBs to docx file with simple API Call. Currently only support PostgreSQL

## Prerequisite  
- NodeJS V16++

## How to run  
Install deps  
```bash
npm install
```
Run API
```bash
npm run start
```

## Install in Docker
```bash
docker run -d -p 3000:3000 sibeur/db_docs
```

## Usage  
```bash
curl --location '$BASE_URL/db-docs?export_as=docx' \
--header 'Content-Type: application/json' \
--data '{
    "config": {
        "host":"",
        "port": "",
        "user": "",
        "password": "",
        "database": "",
        "ssl": true
    },
    "schemas": [
        {
            "name": "your schema want to generate documentation",
            "tables": ['table1','table2']
        },
        {
            "name": "schema 2",
            "tables": []
        }
    ]
}'
```