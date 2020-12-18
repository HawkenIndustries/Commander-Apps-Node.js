const delay = time => new Promise(res => setTimeout(res, time));

$(document).ready(function(){  
	$('#loadDevices').click(function(){
		let btn = $(this);
		btn.addClass('disabled');
		$.ajax({
			type: 'GET',
			url: '/api/devices',
			xhrFields: {
				withCredentials: true
			},
			cache: false,
			success: function(data){
				btn.removeClass('disabled');
				console.log('data', data);
				if(data.results){
					$('#deviceViewer').show();
					let s = '';
					for(let i in data.results){
						let d = data.results[i];
						s += '<tr>';
						s += '<td>'+(d.tags.dis||'')+'</td>';
						s += '<td>'+(d.tags.id||'')+'</td>';
						s += '</tr>';
					}
					$('#deviceTableBody').html(s);
				}
			}
		}).fail(function(){
			btn.removeClass('disabled');
			alert('Failed to fetch data. Please try again');
		});
		return false;
	});

	$('#loadPoints').click(function(){
		let btn = $(this);
		btn.addClass('disabled');
		$.ajax({
			type: 'GET',
			url: '/api/points',
			xhrFields: {
				withCredentials: true
			},
			cache: false,
			success: function(data){
				btn.removeClass('disabled');
				console.log('data', data);
				if(data.results){
					$('#pointViewer').show();
					let s = '';
					for(let i in data.results){
						let d = data.results[i];
						s += '<tr>';
						s += '<td>'+(d.tags.dis||'')+'</td>';
						s += '<td>'+(d.tags.id||'')+'</td>';
						s += '<td>'+(d.tags.curVal||'')+'</td>';
						s += '<td>'+(d.tags.unit||'')+'</td>';
						s += '</tr>';
					}
					$('#pointTableBody').html(s);
				}
			}
		}).fail(function(){
			btn.removeClass('disabled');
			alert('Failed to fetch data. Please try again');
		});
		return false;
	});
});