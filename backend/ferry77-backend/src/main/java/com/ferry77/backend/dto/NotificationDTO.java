package com.ferry77.backend.dto;

public class NotificationDTO {


public String title;
public String message;
public String type;
public Object payload;


public NotificationDTO(){}
public NotificationDTO(String title, String message,String type, Object payload){


    this.title=title;
     this.message=message;
     this.type=type;
      this.payload=payload;
       
}
}