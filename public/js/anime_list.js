"use strict";

$(document).ready(function () {
	var form = $("#searchForm");
	if(window.localStorage["filterData"]) {
		var rawFormData = JSON.parse(window.localStorage["filterData"]);
		var elems = document.getElementById("searchForm").elements;
		rawFormData.forEach(data => {
			elems[data.name].value = data.value;
		});
	}
	function obtainNewData() {
		var rawFormData = form.serializeArray();
		window.localStorage["filterData"] = JSON.stringify(rawFormData);
		var processed = {};
		rawFormData.forEach(data => {
			var name = data.name;
			var value = data.value;
			if(name.includes("-")) {
				var splitInd = name.indexOf("-");
				var splitFirst = name.substr(0, splitInd);
				var splitSecond = name.substr(splitInd + 1);
				if(processed[splitFirst] === undefined) {
					processed[splitFirst] = [];
				}
				if(value === "on") {
					processed[splitFirst].push(splitSecond);
				}
			} else {
				processed[name] = value;
			}
		});
		$.ajax({
			type: "POST",
			url: "/anime_list_query",
			data: JSON.stringify(processed),
			contentType: "application/json",
			success: function(result) {
				$("#main_list").html(result);
			}
		});
	}
	form.on("input", obtainNewData);
	form.on("submit", obtainNewData);
	obtainNewData();

	var pageDom = $("#page");

	$("#btn_prev_page").on("click", function() {
		pageDom.val(Math.max(1, pageDom.val() - 1));
		obtainNewData();
	});

	$("#btn_next_page").on("click", function() {
		pageDom.val(parseInt(pageDom.val()) + 1);
		obtainNewData();
	});
});

