package com.ferry77.backend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "proposal_items",
       indexes = {
         @Index(name = "idx_proposal_item_proposal", columnList = "proposal_id")
       })
public class ProposalItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "proposal_id", nullable = false)
    private Proposal proposal;

    @Column(name = "product_name", nullable = false)
    private String productName;

    @Column(name = "quantity", nullable = false)
    private Integer quantity = 1;

    @Column(name = "unit_price", nullable = false)
    private Long unitPrice = 0L;

    @Column(name = "total_price", nullable = false)
    private Long totalPrice = 0L;

    @Column(name = "comments", columnDefinition = "TEXT")
    private String comments;

    // Getters y Setters
    public Long getId() { return id; }
    public Proposal getProposal() { return proposal; }
    public void setProposal(Proposal proposal) { this.proposal = proposal; }
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