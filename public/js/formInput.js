$(function() {
    $('#registerFormSubmit').on('click', function(event) {
        event.preventDefault();

        $.ajax({
            global: false,
            type: 'POST',
            url: '/registered',
            dataType: 'html',
            data: {
                firstName: $("#firstName").val(),
                lastName: $("#lastName").val(),
                password: $("#password").val(),
                passwordVeryify: $("#passwordVerify").val(),
                email: $("#email").val(),
                username: $("#username").val()
            },
            success: function(result) {
                var messageJson = JSON.parse(result);
                if (messageJson.displayMessage.type == "Success") {
                    //user is redicrected and response is successful
                    location.href = "/login"
                } else if (messageJson.displayMessage.type == "Warn") {
                    //warning message is displayed and banner is shown
                    $("#pageBanner").text(messageJson.displayMessage.message);
                    $("#pageBanner").removeClass("alert-danger").addClass("alert-warning");
                    $("#pageBanner").show();
                } else if (messageJson.displayMessage.type == "Error") {
                    //error message is displayed and banner is shown
                    $("#pageBanner").text(messageJson.displayMessage.message);
                    $("#pageBanner").removeClass("alert-warning").addClass("alert-danger");
                    $("#pageBanner").show();
                }
            },
            error: function(request, status, error) {
                serviceError();
            }
        });

    });
});


$(function() {
    $('.likePost, .unlikePost').on('click', function(e) {
        var postID = $(this).attr('name');
        var postTitle = $(this).attr('postTitle');
        if ($(this).hasClass("likePost")) {
            $('[name="' + postID + '"]').find("path").attr('d', "M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314z")
            $('[name="' + postID + '"]').find("small").html(parseInt($('[name="' + postID + '"]').find("small").html()) + 1)
            $('[name="' + postID + '"]').removeClass("likePost");
            $('[name="' + postID + '"]').addClass("unlikePost")
            $.ajax({
                global: false,
                type: 'put',
                url: '/group/likePost',
                dataType: 'json',
                data: {
                    postID,
                    postTitle
                },
                success: function(result) {
                    if (result.status == 'failed') {
                        window.location.href = "/login";
                    }
                },
                error: function(request, status, error) {
                    console.log(error, status, request)
                }
            });
        } else {
            $('[name="' + postID + '"]').find("path").attr('d', "m8 2.748-.717-.737C5.6.281 2.514.878 1.4 3.053c-.523 1.023-.641 2.5.314 4.385.92 1.815 2.834 3.989 6.286 6.357 3.452-2.368 5.365-4.542 6.286-6.357.955-1.886.838-3.362.314-4.385C13.486.878 10.4.28 8.717 2.01L8 2.748zM8 15C-7.333 4.868 3.279-3.04 7.824 1.143c.06.055.119.112.176.171a3.12 3.12 0 0 1 .176-.17C12.72-3.042 23.333 4.867 8 15z")
            $('[name="' + postID + '"]').find("small").html(parseInt($('[name="' + postID + '"]').find("small").html()) - 1)
            $('[name="' + postID + '"]').removeClass("unlikePost");
            $('[name="' + postID + '"]').addClass("likePost")
            $.ajax({
                global: false,
                type: 'put',
                url: '/group/unlikePost',
                dataType: 'json',
                data: {
                    postID
                },
                success: function(result) {
                    if (result.status == 'failed') {
                        window.location.href = "/login";
                    }
                },
                error: function(request, status, error) {
                    console.log(error, status, request)
                }
            });

        }
    })

    //jQuery function to handle login form submit
    $(function() {
        //Triggers function when the login button is clicked
        $('#loginFormSubmit').on('click', function(event) {
            //Prevents page refresh
            event.preventDefault();
            //sends an ajax request to the server to log the user in or return and error
            $.ajax({
                global: false,
                type: 'POST',
                url: '/loggedin',
                dataType: 'html',
                data: {
                    //sends data from the form
                    email: $("#email").val(),
                    password: $("#password").val()
                },
                success: function(result) {
                    var messageJson = JSON.parse(result);
                    if (messageJson.displayMessage.type == "Success") {
                        //user is redicrected and response is successful
                        location.href = "/"
                    } else if (messageJson.displayMessage.type == "Warn") {
                        //warning message is displayed and banner is shown
                        $("#pageBanner").text(messageJson.displayMessage.message);
                        $("#pageBanner").removeClass("alert-danger").addClass("alert-warning");
                        $("#pageBanner").show();
                    } else if (messageJson.displayMessage.type == "Error") {
                        //error message is displayed and banner is shown
                        $("#pageBanner").text(messageJson.displayMessage.message);
                        $("#pageBanner").removeClass("alert-warning").addClass("alert-danger");
                        $("#pageBanner").show();
                    }
                },
                error: function(request, status, error) {
                    console.log(error)
                }
            });
        });
    });

});

$(document).ready(function() {
    $('.errorBanner').hide();
    $('#postcodeInputForm').on('submit', function(e) {
        e.preventDefault();
        const inputPostcode = $("#postcode").val();
        if (!inputPostcode) {
            $('.errorMessage').html('Please enter a Postcode');
            $('.errorBanner').show();
            return false;
        } else {
            $.get("http://api.postcodes.io/postcodes/" + inputPostcode + "/validate", function(postcodeValidationRes) {
                let pRes = postcodeValidationRes.result;
                if (pRes) {
                    $('#postcodeInputForm').unbind('submit').submit()
                    return true;
                } else {
                    $('.errorMessage').html('Invalid Postcode');
                    $('.errorBanner').show();
                    return false;
                }
            })
        }
    });
});