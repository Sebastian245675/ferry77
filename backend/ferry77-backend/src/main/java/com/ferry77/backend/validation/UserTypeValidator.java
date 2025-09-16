package com.ferry77.backend.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import java.util.Arrays;
import java.util.List;

public class UserTypeValidator implements ConstraintValidator<ValidUserType, String> {
    
    private static final List<String> VALID_USER_TYPES = Arrays.asList("cliente", "ferreteria");
    
    @Override
    public void initialize(ValidUserType constraintAnnotation) {
        // No initialization needed
    }
    
    @Override
    public boolean isValid(String userType, ConstraintValidatorContext context) {
        if (userType == null) {
            return false;
        }
        return VALID_USER_TYPES.contains(userType.toLowerCase());
    }
}