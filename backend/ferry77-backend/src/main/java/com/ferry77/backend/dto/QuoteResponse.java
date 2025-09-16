package com.ferry77.backend.dto;

/**
 * DTO for quote responses to the frontend
 */
public class QuoteResponse {
    private Long id;
    private String company;
    private String vehicleType;
    private Integer price;
    private String formattedPrice;
    private String estimatedTime;
    private Double rating;
    private Boolean available;

    // Constructors
    public QuoteResponse() {}

    public QuoteResponse(Long id, String company, String vehicleType, Integer price, 
                        String formattedPrice, String estimatedTime, Double rating, Boolean available) {
        this.id = id;
        this.company = company;
        this.vehicleType = vehicleType;
        this.price = price;
        this.formattedPrice = formattedPrice;
        this.estimatedTime = estimatedTime;
        this.rating = rating;
        this.available = available;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCompany() { return company; }
    public void setCompany(String company) { this.company = company; }

    public String getVehicleType() { return vehicleType; }
    public void setVehicleType(String vehicleType) { this.vehicleType = vehicleType; }

    public Integer getPrice() { return price; }
    public void setPrice(Integer price) { this.price = price; }

    public String getFormattedPrice() { return formattedPrice; }
    public void setFormattedPrice(String formattedPrice) { this.formattedPrice = formattedPrice; }

    public String getEstimatedTime() { return estimatedTime; }
    public void setEstimatedTime(String estimatedTime) { this.estimatedTime = estimatedTime; }

    public Double getRating() { return rating; }
    public void setRating(Double rating) { this.rating = rating; }

    public Boolean getAvailable() { return available; }
    public void setAvailable(Boolean available) { this.available = available; }

    @Override
    public String toString() {
        return "QuoteResponse{" +
                "id=" + id +
                ", company='" + company + '\'' +
                ", vehicleType='" + vehicleType + '\'' +
                ", price=" + price +
                ", formattedPrice='" + formattedPrice + '\'' +
                ", estimatedTime='" + estimatedTime + '\'' +
                ", rating=" + rating +
                ", available=" + available +
                '}';
    }
}