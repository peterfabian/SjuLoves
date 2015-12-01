var album_element_mapping = {};
var max_img_enlarge = 1.0;

function getScrollBarWidth () {
    var $outer = $('<div>').css({visibility: 'hidden', width: 100, overflow: 'scroll'}).appendTo('body'),
        widthWithScroll = $('<div>').css({width: '100%'}).appendTo($outer).outerWidth();
    $outer.remove();
    return 100 - widthWithScroll;
};

var artificialResponsiveness = function(e){
    for(var key in album_element_mapping){
        var destination_id = album_element_mapping[key].element_;
        var album_div = document.getElementById(destination_id.replace("#", ""));
        var new_width = 0;
        if (album_element_mapping[key].last_width === 0) {
            // init in the beginning: the client width does not know yet 
            // that we will need a scrollbar
            new_width = Math.ceil(album_div.parentNode.clientWidth - getScrollBarWidth());
        }
        else {
            // when resizing after the init, the scrollbar is already excluded
            new_width = Math.ceil(album_div.parentNode.clientWidth );
        }
        // hm, that is strange, now the scrollbar subtraction is not needed?
        new_width = Math.ceil(album_div.parentNode.clientWidth );
        var flickr_data = album_element_mapping[key].data_st;
        if (new_width !== album_element_mapping[key].last_width) {
            $(destination_id).css("width", new_width);
            console.log(new_width);
            showPhotos(flickr_data.photoset.photo, destination_id, album_element_mapping[key].row_height_);
            // since showPhotos destroys the contents of description_id element, we need to re-create the photoswipe, too :/
            initPhotoSwipeFromDOM(destination_id);
            album_element_mapping[key].last_width = new_width;
        };
    };
};

window.onresize = artificialResponsiveness;

var prepareFlickrAlbum = function(album_id, destination_id, max_pictures, row_height){
    // initialize element width
    max_pictures = typeof max_pictures !== 'undefined' ? max_pictures : 30;
    row_height = typeof row_height !== 'undefined' ? row_height : 200;
    
    destination_id = "#" + destination_id;
    $.ajax({
            url : 'https://api.flickr.com/services/rest/?jsoncallback=?',
            method: 'get',
            data : {
                method : 'flickr.photosets.getPhotos',
                api_key : '92da12e7f9430472a8ce2276d8bfb3e5',
                format : 'json',
                photoset_id: album_id,
                extras: "o_dims,url_k,url_s,url_m,url_o,url_t,url_q,url_n,url_z,url_c,url_l,url_h",
                per_page : max_pictures
            },
            dataType: 'json',
            success : function(data){
                album_element_mapping[album_id] = {
                    element_: destination_id,
                    data_st : data,
                    last_width: 0,
                    max_pictures_: max_pictures,
                    row_height_: row_height
                };
                
                artificialResponsiveness();
            }
        });
};

var getFlickrPhotoDescription = function(photoId){
    // fetch the photo title and description and 
    // put it under the photo
    $.ajax({
            url : 'https://api.flickr.com/services/rest/?jsoncallback=?',
            method: 'get',
            data : {
                method : 'flickr.photos.getInfo',
                api_key : '92da12e7f9430472a8ce2276d8bfb3e5',
                format : 'json',
                photo_id : photoId
            },
            dataType: 'json',
            success : function(data){
                var element = document.getElementById(photoId + "-caption");
                var doc = new DOMParser().parseFromString(data.photo.description._content, 'text/xml');
                var link_to_article = doc.getElementsByTagName("a");
                if (link_to_article.length > 0) {
                    link_to_article = link_to_article[0].getAttribute("href");
                    element.innerHTML = '<a href="' + link_to_article + '">' + data.photo.title._content+ '</a>';
                }
                else {
                    element.innerHTML = data.photo.title._content;
                };
            }
        });
};

var showPhotos = function(photos, destination_id, row_height){
    $(destination_id).empty().justifiedImages({
        images : photos,
        rowHeight: row_height,
        maxRowHeight: row_height * 2,
        thumbnailPath: function(photo, width, height){
            var purl = photo.url_s;
            if( photo.url_n && (width > photo.width_s * max_img_enlarge || height > photo.height_s * max_img_enlarge) ) purl = photo.url_n;
            if( photo.url_m && (width > photo.width_n * max_img_enlarge || height > photo.height_n * max_img_enlarge) ) purl = photo.url_m;
            if( photo.url_z && (width > photo.width_m * max_img_enlarge || height > photo.height_m * max_img_enlarge) ) purl = photo.url_z;
            if( photo.url_l && (width > photo.width_z * max_img_enlarge || height > photo.height_z * max_img_enlarge) ) purl = photo.url_l;
            return purl;
        },
        getSize: function(photo){
            return {width: photo.width_s, height: photo.height_s};
        },
        margin: 16,
        
        template: function(photo){
            getFlickrPhotoDescription(photo.id);
            // get one of the existing large images for the detailed view link
            var size_factor = 1.2; // so that we pick images slightly larger than browser's view
            var view_width = $(window).width() * size_factor;
            var view_height = $(window).height() * size_factor;
            var size_index = "o";
            if (photo.url_k && (view_width < photo.width_k || view_height < photo.height_k)) size_index = "k";
            if (photo.url_h && (view_width < photo.width_h || view_height < photo.height_h)) size_index = "h";
            if (photo.url_l && (view_width < photo.width_l || view_height < photo.height_l)) size_index = "l";
            var htmlString = "";
            htmlString += '  <div class="photo-container" style="height:' + photo.displayHeight + 'px;margin-right:' + photo.marginRight + 'px;">';
            htmlString += '<figure itemscope itemtype="http://schema.org/ImageObject" style="margin: 0;">';
            htmlString += '    <a href="' + photo["url_" + size_index] + '" itemprop="contentUrl" data-size="' + photo["width_" + size_index] + 'x' + photo["height_" + size_index] + '">';
            
            htmlString += '     <img class="image-thumb" src="' + photo.src + '" style="width:' + photo.displayWidth + 'px;height:' + photo.displayHeight + 'px;" >';
            
            htmlString += '    </a>';
            
            htmlString += '  <figcaption id="'+photo.id+'-caption" itemprop="caption description" style="display: none;"></figcaption>';
            htmlString += '</figure>';
            htmlString += '  </div>';
            
            return htmlString;
        },
        imageSelector: "image-thumb",
        imageContainer: "photo-container"
    });
};