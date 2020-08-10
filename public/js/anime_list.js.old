let make_update_page_request = function(data){
    console.log("request made");
    form = $('<form action="anime_list" method="POST"></form>');
    $("<input>").attr("name", "sort_field").val(data["sort_field"]).appendTo(form);
    $("<input>").attr("name", "sort_order").val(data["sort_order"]).appendTo(form);
    $("<input>").attr("name", "page").val(data["page"]).appendTo(form);
    $("<input>").attr("name", "search").val(JSON.stringify(data["search"])).appendTo(form);
    $("<input>").attr("name", "type").val(data["type"]).appendTo(form);
    form.hide();
    form.appendTo($("body"))
    form.submit();
}

let set_search_fields_based_on_default = function(){
    data_parameters["search"] = search_params
}

$("#btn_refresh").click(function() {
    set_search_fields_based_on_default()
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

let update_search_fields = function(){
    data_parameters["search"]["title"] = $("#search_title").val()
    data_parameters["search"]["min_score"] = $("#search_score").val()
    // data_parameters["search"]["min_votes"] = $("#search_votes").val()


    let builder = []
    let possibilities = ["special", "tv", "movie"]
    for (let i in possibilities){
        if ($("#stype_" + possibilities[i]).is(':checked')){
            builder = builder.concat(possibilities[i])
        }
    }
    data_parameters["search"]["type"] = builder.join(" ")

    builder = []
    possibilities = ["original", "light_novel", "manga"]
    for (let i in possibilities){
        if ($("#sadapt_" + possibilities[i]).is(':checked')){
            builder = builder.concat(possibilities[i])
        }
    }
    data_parameters["search"]["adapt"] = builder.join(" ")
}

$("#search_request").click(function() {
    update_search_fields()
    make_update_page_request(data_parameters)
})

//$("#search_toggle").click(function() {
//    $('#search_box').toggle("slow");
//})

$('#search_box input').keypress(function (e) {
    if (e.which == 13) {
        update_search_fields()
        make_update_page_request(data_parameters)
    }
});


var data_parameters = {}
$(document).ready(function () {
    data_parameters["sort_field"] = $("#inp_sort_field").val();
    data_parameters["sort_order"] = $("#inp_sort_order").val();
    data_parameters["page"] = $("#current_page_indicator").text();
    data_parameters["search"] = {
        "title": null
    }

    function decodeHtml(html) {
        var txt = document.createElement("textarea");
        txt.innerHTML = html;
        return txt.value;
    }

    search_params = decodeHtml(decodeHtml(search_params)).replace(/^"+|"+$/g, '')
    search_params = JSON.parse(search_params)
    
    console.log("Loaded function called")
//    $('#search_box').hide();
});





