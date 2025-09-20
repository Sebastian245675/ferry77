package com.ferry77.backend.dto;

import java.util.List;

public class CreateProposalRequest {

    private Long companyId;
    private String companyName; // Nombre de la empresa para notificaciones
    private Long solicitudId;
    private String currency = "COP";
    private String deliveryTime; // Tiempo de entrega
    private List<ProposalItemRequest> items;

    public static class ProposalItemRequest {
        private String productName;
        private Integer quantity;
        private Long unitPrice;
        private String comments;

        // Getters y Setters
        public String getProductName() { return productName; }
        public void setProductName(String productName) { this.productName = productName; }
        public Integer getQuantity() { return quantity; }
        public void setQuantity(Integer quantity) { this.quantity = quantity; }
        public Long getUnitPrice() { return unitPrice; }
        public void setUnitPrice(Long unitPrice) { this.unitPrice = unitPrice; }
        public String getComments() { return comments; }
        public void setComments(String comments) { this.comments = comments; }
    }

    // Getters y Setters
    public Long getCompanyId() { return companyId; }
    public void setCompanyId(Long companyId) { this.companyId = companyId; }
    public String getCompanyName() { return companyName; }
    public void setCompanyName(String companyName) { this.companyName = companyName; }
    public Long getSolicitudId() { return solicitudId; }
    public void setSolicitudId(Long solicitudId) { this.solicitudId = solicitudId; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public String getDeliveryTime() { return deliveryTime; }
    public void setDeliveryTime(String deliveryTime) { this.deliveryTime = deliveryTime; }
    public List<ProposalItemRequest> getItems() { return items; }
    public void setItems(List<ProposalItemRequest> items) { this.items = items; }
}