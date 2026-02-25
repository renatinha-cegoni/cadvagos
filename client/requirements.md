## Packages
jspdf | Generates PDF documents from the cartorial reports
html2canvas | Renders HTML elements to canvas for PDF export
docx | Generates Word documents (.docx) from data
file-saver | Saves the generated .docx files to the user's computer

## Notes
- App uses frontend-only authentication as requested (password 'ari' for login, '1837' for edit/delete).
- Upload endpoint POST /api/upload expects multipart/form-data with a 'file' field and returns { imageUrl: string }.
- All form inputs are automatically converted to uppercase on change.
