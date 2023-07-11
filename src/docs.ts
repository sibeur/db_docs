import { Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TableWidthElement, TextRun, VerticalAlign, WidthType } from "docx";
import { Pool, PoolClient, PoolConfig } from "pg";
import * as fs from "fs";
export type DocsSchemaOption = {
  name: string,
  tables: string[],
}

export type DocsTableColumn = {
  name: string,
  dataType: string,
  aliasDataType: string,
  desc?: string,
  nullable?: string,
  length?: number,
  constraints?: string[]
}

export type DocsTable = {
  name: string,
  desc?: string,
  columns: DocsTableColumn[]
}

export type DocsSchema = {
  name: string,
  desc?: string,
  tables: DocsTable[]
}

export async function getClient(config: PoolConfig): Promise<PoolClient> {
  const pool = new Pool(config);
  return pool.connect();
}

export async function getSchemaTables(config: PoolConfig, schemaName: string) {
    const client = await getClient(config);
    try {
      const result = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = '${schemaName}'`);
      const tables = result.rows.map((row: any) => row.table_name);
      return tables;
    } catch (error) {
      return Promise.reject(error);
    } finally {
      client.release();
    }
} 

export async function getTablesInfo(config: PoolConfig, option: DocsSchemaOption) {
  const client = await getClient(config);
  if (option.tables.length < 1) {
    option.tables = await getSchemaTables(config, option.name)
  }
  const sql = `SELECT cols.*, col_comments.description AS column_desc FROM information_schema.columns AS cols
  LEFT JOIN pg_description AS col_comments
      ON col_comments.objoid = (quote_ident(cols.table_schema) || '.' || quote_ident(cols.table_name))::regclass
      AND col_comments.objsubid = cols.ordinal_position
  WHERE cols.table_schema = '${option.name}' AND cols.table_name IN(${option.tables.map((tab) => (`'${tab}'`)).join(',')});`
  try {
    const results = await client.query(sql);
    return results.rows;
  } catch (error) {
    return Promise.reject(error);
  } finally {
    client.release();
  }
}

export async function getTablesConstraint(config: PoolConfig, option: DocsSchemaOption) {
  const client = await getClient(config);
  if (option.tables.length < 1) {
    option.tables = await getSchemaTables(config, option.name)
  }
  const sql = `SELECT DISTINCT
    tc.constraint_name,
    tc.constraint_type,
    tc.table_name,
    kcu.column_name
  FROM
    information_schema.table_constraints AS tc
    JOIN information_schema.constraint_column_usage AS ccu
        ON tc.constraint_name = ccu.constraint_name
    JOIN information_schema.key_column_usage AS kcu
        ON kcu.constraint_name = tc.constraint_name
  WHERE tc.table_schema = '${option.name}' AND tc.table_name IN(${option.tables.map((tab) => (`'${tab}'`)).join(',')});`
  try {
    const results = await client.query(sql);
    return results.rows;
  } catch (error) {
    return Promise.reject(error);
  } finally {
    client.release();
  }
}

export async function getDocs(config: PoolConfig, option: DocsSchemaOption) {
  const [tableInfos, tableConstraints] = await Promise.all([
    getTablesInfo(config, option),
    getTablesConstraint(config, option),
  ]);
  const docs: DocsSchema = {
    name: option.name,
    tables: option.tables.map((tableName) => ({
        name: tableName,
        columns: tableInfos.filter(col => col.table_name === tableName).map(col => ({
          name: col.column_name,
          desc: col.column_desc ?? '',
          dataType: col.data_type,
          aliasDataType: col.udt_name,
          length: col.character_maximum_length ?? col.numeric_precision ?? null,
          nullable: col.is_nullable,
          constraints: tableConstraints 
          .filter(con => (con.table_name == tableName))
          .filter(con => (con.column_name == col.column_name))
          .map(con => (con.constraint_type))
        }))
    }))
  }
  return docs
}

export async function jsonToDocs(json: DocsSchema[]) {
  const schemaTables = json.flatMap(data => {
    return [
      new Paragraph({
        text: data.name,
        heading: HeadingLevel.HEADING_2,
      }),
      new Paragraph(`Description: ${data.desc ?? ''}`),
      ...data.tables.flatMap(table => {
        return [
          new Paragraph({
            text: table.name,
            heading: HeadingLevel.HEADING_3,
          }),
          new Paragraph(`Description: ${table.desc ?? ''}`),
          new Table({
            width: {
              size: "100%",
              type: WidthType.AUTO
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    verticalAlign: VerticalAlign.CENTER,
                    children: [
                      new Paragraph("Column Name")
                    ]
                  }),
                  new TableCell({
                    children: [
                      new Paragraph("Data Type")
                    ]
                  }),
                  new TableCell({
                    children: [
                      new Paragraph("Keys")
                    ]
                  }),
                  new TableCell({
                    children: [
                      new Paragraph("Nullable")
                    ]
                  }),
                  new TableCell({
                    children: [
                      new Paragraph("Description")
                    ]
                  })
                ]
              }),
              ...table.columns.flatMap(col => {
                const dataType = col.length == null? col.dataType: `${col.dataType}(${col.length})`
                const constraints: string[] = col.constraints ?? []
                return [
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [
                          new Paragraph(col.name)
                        ]
                      }),
                      new TableCell({
                        children: [
                          new Paragraph(dataType)
                        ]
                      }),
                      new TableCell({
                        children: constraints
                        .filter(con => con == 'PRIMARY KEY')
                        .flatMap(con => {
                          return [
                            new Paragraph(con)
                          ]
                        })
                      }),
                      new TableCell({
                        children: [
                          new Paragraph(col.nullable ?? '')
                        ]
                      }),
                      new TableCell({
                        children: [
                          new Paragraph(col.desc ?? '')
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      })
    ]
  })
  const doc = new Document({
    sections: [
      {
        children: schemaTables
      }
    ]
  })
  const filePath = `out/db_docs_${Date.now()}.docx`;
  const buff = await Packer.toBuffer(doc);
  fs.writeFileSync(filePath,buff);
  return filePath;
}
