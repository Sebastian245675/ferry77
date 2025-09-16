package com.ferry77.backend.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.*;

@Documented
@Constraint(validatedBy = UserTypeValidator.class)
@Target({ElementType.FIELD})
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidUserType {
    String message() default "Tipo de usuario no válido. Solo se permiten: cliente, ferreteria";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}