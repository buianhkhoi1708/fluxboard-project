package com.fluxboard.auth.model;

import java.util.List;

public record AuthenticatedUser(
        String userId,
        String roleId,
        List<String> authorities 
) {
}