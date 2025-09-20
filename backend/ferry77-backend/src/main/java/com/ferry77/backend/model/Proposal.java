package com.ferry77.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "proposals",
       indexes = {
         @Index(name = "idx_proposal_solicitud", columnList = "solicitud_id"),
         @Index(name = "idx_proposal_company", columnList = "company_id"),
         @Index(name = "idx_proposal_created", columnList = "created_at")
       })
public class Proposal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "company_id", nullable = false)
    private Long companyId;

    @Column(name = "company_name", length = 255)
    private String companyName;

    @Column(name = "solicitud_id", nullable = false)
    private Long solicitudId;

    @Column(name = "total", nullable = false)
    private Long total = 0L;

    @Column(name = "currency", length = 8)
    private String currency = "COP";

    @Column(name = "status", length = 32)
    private String status = "ENVIADA";

    @Column(name = "delivery_time", length = 100)
    private String deliveryTime;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @OneToMany(mappedBy = "proposal", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<ProposalItem> items;

    // Getters y Setters
    public Long getId() { return id; }
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
    public List<ProposalItem> getItems() { return items; }
    public void setItems(List<ProposalItem> items) { this.items = items; }
}