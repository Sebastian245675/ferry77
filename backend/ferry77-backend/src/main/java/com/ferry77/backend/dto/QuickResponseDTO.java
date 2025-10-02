package com.ferry77.backend.dto;

public class QuickResponseDTO {
    private Long companyId;
    private Long solicitudId;
    private String companyName;
    private String responseType; // 'message', 'image', 'excel'
    private String message;
    private String fileName;
    private String fileType;
    private String fileUrl;
    private Long fileSize;
    
    // Constructors
    public QuickResponseDTO() {}
    
    public QuickResponseDTO(Long companyId, Long solicitudId, String companyName, 
                           String responseType, String message) {
        this.companyId = companyId;
        this.solicitudId = solicitudId;
        this.companyName = companyName;
        this.responseType = responseType;
        this.message = message;
    }
    
    // Getters and Setters
    public Long getCompanyId() { return companyId; }
    public void setCompanyId(Long companyId) { this.companyId = companyId; }
    
    public Long getSolicitudId() { return solicitudId; }
    public void setSolicitudId(Long solicitudId) { this.solicitudId = solicitudId; }
    
    public String getCompanyName() { return companyName; }
    public void setCompanyName(String companyName) { this.companyName = companyName; }
    
    public String getResponseType() { return responseType; }
    public void setResponseType(String responseType) { this.responseType = responseType; }
    
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    
    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }
    
    public String getFileType() { return fileType; }
    public void setFileType(String fileType) { this.fileType = fileType; }
    
    public String getFileUrl() { return fileUrl; }
    public void setFileUrl(String fileUrl) { this.fileUrl = fileUrl; }
    
    public Long getFileSize() { return fileSize; }
    public void setFileSize(Long fileSize) { this.fileSize = fileSize; }
}