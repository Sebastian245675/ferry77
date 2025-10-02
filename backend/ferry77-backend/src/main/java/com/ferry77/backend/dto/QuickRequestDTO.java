package com.ferry77.backend.dto;

import java.util.List;
import java.util.Map;

public class QuickRequestDTO {
    private String title;
    private String textDescription;
    private List<FileInfo> uploadedFiles;
    private String profession;
    private String location;
    private String userId;
    private String userName;
    private String userEmail;
    private String userPhone;
    
    // Constructors
    public QuickRequestDTO() {}

    // Getters and Setters
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getTextDescription() { return textDescription; }
    public void setTextDescription(String textDescription) { this.textDescription = textDescription; }

    public List<FileInfo> getUploadedFiles() { return uploadedFiles; }
    public void setUploadedFiles(List<FileInfo> uploadedFiles) { this.uploadedFiles = uploadedFiles; }

    public String getProfession() { return profession; }
    public void setProfession(String profession) { this.profession = profession; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }

    public String getUserEmail() { return userEmail; }
    public void setUserEmail(String userEmail) { this.userEmail = userEmail; }

    public String getUserPhone() { return userPhone; }
    public void setUserPhone(String userPhone) { this.userPhone = userPhone; }

    public static class FileInfo {
        private String fileName;
        private String fileType;
        private Map<String, Object> extractedData;

        // Constructors
        public FileInfo() {}

        // Getters and Setters
        public String getFileName() { return fileName; }
        public void setFileName(String fileName) { this.fileName = fileName; }

        public String getFileType() { return fileType; }
        public void setFileType(String fileType) { this.fileType = fileType; }

        public Map<String, Object> getExtractedData() { return extractedData; }
        public void setExtractedData(Map<String, Object> extractedData) { this.extractedData = extractedData; }
    }
}