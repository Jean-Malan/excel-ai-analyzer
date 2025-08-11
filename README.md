# Excel AI Analyzer

An intelligent Excel analysis tool that leverages AI to process and analyze your spreadsheet data. Upload your Excel files, select columns, define analysis tasks, and let AI generate insights automatically.

## ✨ Features

### 🚀 **Smart File Handling**
- **Excel Upload**: Support for `.xlsx` and `.xls` files
- **Paste Mode**: Copy data directly from Excel and paste it in the app
- **Multi-Sheet Support**: Handle Excel files with multiple worksheets
- **Development Mode**: Auto-loads sample data for testing

### 🤖 **AI-Powered Analysis**
- **Multiple AI Models**: Choose from 5 different OpenAI models
  - **4o-mini** (Fastest) - $0.60/1M input tokens
  - **GPT-5 Nano** (Most Affordable) - $0.05/1M input tokens
  - **GPT-5 Mini** (Balanced) - $0.25/1M input tokens
  - **o4-mini** (Advanced Reasoning) - $1.10/1M input tokens
  - **GPT-4.1** (Most Capable) - $2.00/1M input tokens
- **Custom Analysis Prompts**: Define exactly what analysis you want
- **Flexible Output**: Add to existing columns or create new ones

### 💰 **Cost Transparency**
- **Real-time Cost Tracking**: See exactly what you're spending
- **Detailed Breakdown**: Input, cached, and output token costs
- **Model Comparison**: Clear pricing information for all models

### 🔄 **Flexible Processing**
- **Pause/Resume**: Stop processing and continue later
- **Rerun Capabilities**: Try different models or prompts without re-uploading
- **Partial Downloads**: Download results even if processing isn't complete
- **Progress Tracking**: Visual progress bars and status updates

### 🛡️ **Security & Privacy**
- **Local Processing**: Your API key stays in your browser
- **No Data Storage**: Files and data are never stored on servers
- **Direct API Calls**: Communications go directly to OpenAI

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- OpenAI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/excel-ai-analyzer.git
   cd excel-ai-analyzer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173`

### Environment Setup (Optional)

For development mode with auto-loading sample data:

1. Create a `.env` file in the root directory
2. Add: `VITE_ENVIRONMENT=development`
3. Place your sample Excel file at `public/files/text.xlsx`

## 📖 How to Use

### 1. **Upload Your Data**
- Click "Click to upload" or drag and drop your Excel file
- **Alternative**: Use "Paste Excel Data" to copy/paste from Excel
- Select the worksheet if your file has multiple sheets

### 2. **Configure Analysis**
- Enter your OpenAI API key (stored locally only)
- Choose your preferred AI model
- Select input columns (the data you want analyzed)
- Choose output destination (existing column or create new)
- Write analysis instructions (what you want the AI to do)

### 3. **Process Your Data**
- Click "Start Analysis" to begin processing
- Monitor progress and costs in real-time
- Pause/resume as needed
- Try different models or prompts with "Rerun"

### 4. **Download Results**
- Download your analyzed Excel file
- Get partial results even if processing isn't complete
- Original data plus AI-generated insights

## 🎯 Example Use Cases

- **Sentiment Analysis**: Analyze customer feedback and reviews
- **Data Categorization**: Classify products, leads, or content
- **Content Summarization**: Create summaries of long text fields
- **Quality Scoring**: Rate and score various data points
- **Translation**: Translate text columns to different languages
- **Extraction**: Pull specific information from unstructured text

## 🏗️ Built With

- **React 18**: Modern React with hooks and functional components
- **Vite**: Fast build tool and development server
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Beautiful SVG icons
- **XLSX**: Excel file parsing and generation
- **OpenAI API**: AI-powered analysis

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## ☕ Support

If this tool saves you time and effort, consider [buying me a coffee](https://buymeacoffee.com/iamjeanmalan) to support continued development!

## 🛠️ Development

### Project Structure
```
src/
├── components/          # Reusable UI components
│   ├── Configuration.jsx
│   ├── DataPreview.jsx
│   ├── FileUpload.jsx
│   ├── PasteModal.jsx
│   ├── ProcessingPanel.jsx
│   ├── ProgressSteps.jsx
│   └── SupportModal.jsx
├── App.jsx             # Main application component
└── main.jsx           # Application entry point
```

### Key Features Implementation
- **Modular Components**: Clean separation of concerns
- **State Management**: React hooks for complex state
- **Cost Calculation**: Real-time API usage tracking
- **File Processing**: Excel parsing with XLSX library
- **API Integration**: Direct OpenAI API communication

---

**Built with ❤️ for productivity enthusiasts**