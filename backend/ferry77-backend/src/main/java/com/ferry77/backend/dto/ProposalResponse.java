package com.ferry77.backend.dto;

import java.time.LocalDateTime;
import java.util.List;

public class ProposalResponse {

    private Long id;
    private Long companyId;
    private String companyName;
    private Long solicitudId;
    private Long total;
    private String currency;
    private String status;
    private String deliveryTime;
    private LocalDateTime createdAt;
    private List<ProposalItemResponse> items;

    public static class ProposalItemResponse {
        private Long id;
        private String productName;
        private Integer quantity;
        private Long unitPrice;
        private Long totalPrice;
        private String comments;

        // Constructor
        public ProposalItemResponse() {}

        public ProposalItemResponse(Long id, String productName, Integer quantity, 
                                   Long unitPrice, Long totalPrice, String comments) {
            this.id = id;
            this.productName = productName;
            this.quantity = quantity;
            this.unitPrice = unitPrice;
            this.totalPrice = totalPrice;
            this.comments = comments;
        }

        // Getters y Setters
        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getProductName() { return productName; }
        public void setProductName(String productName) { this.productName = productName; }
        public Integer getQuantity() { return quantity; }
        public void setQuantity(Integer quantity) { this.quantity = quantity; }
        public Long getUnitPrice() { return unitPrice; }
        public void setUnitPrice(Long unitPrice) { this.unitPrice = unitPrice; }
        public Long getTotalPrice() { return totalPrice; }
        public void setTotalPrice(Long totalPrice) { this.totalPrice = totalPrice; }
        public String getComments() { return comments; }
        public void setComments(String comments) { this.comments = comments; }
    }

    // Constructor
    public ProposalResponse() {}

    public ProposalResponse(Long id, Long companyId, String companyName, Long solicitudId, Long total, 
                           String currency, String status, String deliveryTime, LocalDateTime createdAt, 
                           List<ProposalItemResponse> items) {
        this.id = id;
        this.companyId = companyId;
        this.companyName = companyName;
        this.solicitudId = solicitudId;
        this.total = total;
        this.currency = currency;
        this.status = status;
        this.deliveryTime = deliveryTime;
        this.createdAt = createdAt;
        this.items = items;
    }

    // Getters y Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getCompanyId() { return companyId; }
    public void setCompanyId(Long companyId) { this.companyId = companyId; }
    public String getCompanyName() { return companyName; }
    public void setCompanyName(String companyName) { this.companyName = companyName; }
    public Long getSolicitudId() { return solicitudId; }
    public void setSolicitudId(Long solicitudId) { this.solicitudId = solicitudId; }
    public Long getTotal() { return total; }
    public void setTotal(Long total) { this.total = total; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getDeliveryTime() { return deliveryTime; }
    public void setDeliveryTime(String deliveryTime) { this.deliveryTime = deliveryTime; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public List<ProposalItemResponse> getItems() { return items; }
    public void setItems(List<ProposalItemResponse> items) { this.items = items; }
}