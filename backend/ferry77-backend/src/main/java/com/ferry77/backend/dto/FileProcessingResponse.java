package com.ferry77.backend.dto;

import java.util.List;
import java.util.Map;

public class FileProcessingResponse {
    private String fileName;
    private String fileType;
    private boolean success;
    private String error;
    private Map<String, Object> extractedData;
    private List<Map<String, Object>> items;
    private String description;

    // Constructors
    public FileProcessingResponse() {}

    public FileProcessingResponse(String fileName, String fileType, boolean success) {
        this.fileName = fileName;
        this.fileType = fileType;
        this.success = success;
    }

    // Getters and Setters
    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }

    public String getFileType() { return fileType; }
    public void setFileType(String fileType) { this.fileType = fileType; }

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }

    public String getError() { return error; }
    public void setError(String error) { this.error = error; }

    public Map<String, Object> getExtractedData() { return extractedData; }
    public void setExtractedData(Map<String, Object> extractedData) { this.extractedData = extractedData; }

    public List<Map<String, Object>> getItems() { return items; }
    public void setItems(List<Map<String, Object>> items) { this.items = items; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}