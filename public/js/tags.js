"use strict";

function getTags(addr, done) {
	var xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function() {
		if(xhttp.readyState == 4 && xhttp.status == 200) {
			var source = new Bloodhound({
				datumTokenizer: Bloodhound.tokenizers.whitespace,
				queryTokenizer: Bloodhound.tokenizers.whitespace,
				local: JSON.parse(xhttp.responseText)
			});
			done({
				name: 'tags',
				source: source 
			});
		}
	};
	xhttp.open("GET", addr, true);
	xhttp.send();
}

function setupTags(dom, addr) {
	getTags(addr, (config) => {
		setupTagsOnly(dom, config);
	});
}

function setupTagsOnly(dom, config) {
	dom.typeahead({
		hint: true,
		highlight: true,
		minLength: 0
	}, config);
}
