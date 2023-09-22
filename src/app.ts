import express, { Request, Response } from 'express';
import { ValidationError } from 'joi';
import { docsValidationBody } from './validation';
import { DocsSchema, ExportAs, getDocs, jsonToDocs } from './docs';
import path from 'path';
import * as fs from "fs";

const outDir = 'out'; 

// Check if the directory exists
if (!fs.existsSync(outDir)) {
  // Create the directory
  fs.mkdirSync(outDir, { recursive: true });
  console.log('Directory created successfully');
} else {
  console.log('Directory already exists');
}

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/db-docs', async (req: Request, res: Response) => {
    try {
        const body = req.body;
        const value = await docsValidationBody.validateAsync(body);
        const docsJSON: DocsSchema[] = await Promise.all(value.schemas.map(async (schema: any) => {
            return getDocs(value.config, {name: schema.name, tables: schema.tables})
        }));

        switch (req.query?.export_as) {
          case ExportAs.DOCX:
            const filePath = await jsonToDocs(docsJSON);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            res.setHeader('Content-Disposition', `attachment; filename="db_docs_${Date.now()}.docx"`);
            res.send(fs.readFileSync(filePath));
            fs.unlink(filePath, () => {});
            return 
        }

        return res.json(docsJSON)
    } catch (error: any) {
        if(error instanceof ValidationError) return res.status(400).json({message: error.details[0].message})
        return res.status(500).json({message: error.message})  
    }
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
