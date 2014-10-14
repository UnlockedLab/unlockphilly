$("#form-post-reviews").validate({
    rules: {
        alt_entrance: {
            required: "#yes_entrance:not(:checked)",
        },
    },
    errorPlacement: function(error, element) {
            error.insertBefore(element);
    }
});
