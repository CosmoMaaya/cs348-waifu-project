let make_update_page_request = function(data){
    console.log("request made");
    form = $('<form action="anime_list" method="POST"></form>');
    $("<input>").attr("name", "sort_field").val(data["sort_field"]).appendTo(form);
    $("<input>").attr("name", "sort_order").val(data["sort_order"]).appendTo(form);
    $("<input>").attr("name", "page").val(data["page"]).appendTo(form);
    form.hide();
    form.appendTo($("body"))
    form.submit();
}

$("#btn_refresh").click(function() {
    data_parameters["sort_field"] = $("#inp_sort_field").val();
    data_parameters["sort_order"] = $("#inp_sort_order").val();
    data_parameters["page"] = 0;
    make_update_page_request(data_parameters)

})
let make_page_change_request = function(change){
    data_parameters["page"] = parseInt($("#current_page_indicator").text()) + change;
    make_update_page_request(data_parameters)
}

$("#btn_prev_page").click(function() {make_page_change_request(-1)})
$("#btn_next_page").click(function() {make_page_change_request(1)})

var data_parameters = {}
$(document).ready(function () {
    data_parameters["sort_field"] = $("#inp_sort_field").val();
    data_parameters["sort_order"] = $("#inp_sort_order").val();
    data_parameters["page"] = $("#current_page_indicator").text();
    console.log("Loaded function called")
});





