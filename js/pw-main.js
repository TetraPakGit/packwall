(function () {


  // -----------------
  // Global Variables & other setup
  // -----------------

  // ----
  // Variables from pw-data.js
  // All filter variables (the last four) contain list of packages.
  // These are not referred by ID, but rather index placement in packages array.
  // ----
  // var packages - all packages with attributes
  // var categories - category list with sub categories
  // var volumes - volume list with sub volumes
  // var types - type list with sub types
  // var locations - location list with sub locations
  // var shapes - shape list WITHOUT sub shapes

  var init = true;

  // Layout
  var currentSelection = [];
  var pwTotalPages,
      pwViewportWidth,
      pwProductsPerPage,
      pwProductAmount,
      pwTotalWidth,
      pwResizeTimeout,
      pwCheckTimeout;

  // Paths
  var History = window.History;


 //Used to store current item when History is disabled (PXPL)
 var currentItemID;

  // -----------------
  // Menu & filter
  // -----------------

  // pwMenuInit()
  // The menu mother function. Run this in order to initialize the filter.
  // Since the filter is responsible for loading the correct data, this should be run regardless if
  // you plan to display it (see settings) or not.
  function pwMenuInit() {
    // Initial setup:
    // - Populate filters
    // - Sense active filters
    // - Load data
    if(!settings.showfilter) { $('body').addClass('no-filter'); }
    if(settings.showshape) { $('body').addClass('with-shape'); }

    $('#category .items').append(pwPopulateFilter(categories));
    $('#volume .items').append(pwPopulateFilter(volumes));
    $('#type .items').append(pwPopulateFilter(types));
    $('#location .items').append(pwPopulateFilter(locations));
    $('#shape .items').append(pwPopulateFilter(shapes));

    $('#filter input:checkbox').checkbox({ 'empty': 'js/checkbox/empty.png' });
    $('#filter .items').jScrollPane();

    pwBuildItemDOM();

    var state = History.getState();
    var setfilters = state.hashedUrl.match(/setFilters/);
    if(setfilters == null) { pwGetCurrentSelection(); pwFilterProducts(); }
    pwSenseActiveFilters();

    // Event: Clicking a checkbox
    $('#filter input[type="checkbox"]').click(function(){
      var cb = this;
      clearTimeout(pwCheckTimeout);
        pwCheckTimeout = setTimeout(function(){
        var ischecked = $(cb).prop('checked');

        // Main/subcat toggling
        if($(cb).hasClass('maincb')) {
          $(cb).closest('li').find('ul input').prop('checked', ischecked);
        }

        if($(cb).hasClass('subcb')) {
          var parentCat = $(cb).closest('ul').closest('li').find('.maincb');
          if(ischecked) {
            if(!$(cb).closest('ul').find('input[type="checkbox"]').not(':checked').length) {
              parentCat.attr('checked', true);
            }
          } else {
            parentCat.attr('checked', false);
          }
        }

        // State handling
        var activeFilters = [];
        var i = 0;

        $('#filter input[type="checkbox"]').each(function(){
          if($(this).is(':checked')) {
            var id = $(this).attr('data-id');
            if(id) {
              activeFilters[i] = id;
              i++;
            }
          }
        });

        var object = {
          filters: activeFilters,
          action: 'setfilter'
        };

        History.pushState(object, '', '?setFilters=' + object.filters.join());
      }, 20);
    });

    // Event: Menu header click
    $('#filter-header a').click(function(e){
      pwMenuToggle();
      e.preventDefault();
    });

    // Event: Go button
    $('#set-filter').click(function(e){
      if(!$(this).hasClass('inactive')) {
        pwFilterProducts();
        pwCloseSingleProduct();
        pwMenuToggle();
      }
      e.preventDefault();
    });

    // Event: Reset filter button
    $('#reset-filter').click(function(e){
      var object = { action: 'clearfilter' };
      History.pushState(object, '', '?clear');
      e.preventDefault();
    });

    // Event: Sub cat toggle arrow
    $('.subtoggle').on('click', function(e){
      $(this).closest('li').toggleClass('sub-open');
      $(this).closest('.items').jScrollPane();
      e.preventDefault();
    });

    // Event: Close single product
    $('#single-product .close-single').click(function(e){
      var object = {};
      object.action = 'closesingle';
      if(settings.useHistory)
      {
      	History.pushState(object, '', '?');
      }
      else
      {
      	pwCloseSingleProduct();
      }
      e.preventDefault();
    });

    // Back button in single product
    $('#single-product .back').click(function(e){

      var animateSpeed = 200;
      
      if(settings.useHistory){
		var state = History.getState();
	  }
	  else
	  {
		var state = {};
		state.data = {};
		state.data.action = 'loadsingle';
		state.data.id = currentItemID;
	  }
	  
      if(state.data.action === 'loadsingle') {
        $('#single-product .product').css({
          'left' : 'auto'
        }).animate({
          'right' : 20
        }, animateSpeed, function(){
          $('#single-product .product').animate({
            'right' : -50,
            'opacity' : 0
          }, animateSpeed, function(){
            var item = $("#" + state.data.id);
            var prev = item.prev();
            if (!prev.length && item.parent().prev().length) {
              prev = item.parent().prev().children().last();
            } else if(!prev.length) {
              prev = $('#result .item').last();
            }
            if (prev.length) {
              var object = {
                id: prev.attr('id'),
                index: prev.attr('data-index'),
                action: 'loadsingle'
              };
              if(settings.useHistory)
		      {
		      	History.pushState(object, '', '?package=' + object.id);
		      }
		      else
		      {
		      	currentItemID = object.id;
		      	pwOpenSingleProduct(object.index);
		      }
              
            }
            $('#single-product .product').css({
              'right' : 20
            }).animate({
              'right' : 0,
              'opacity' : 1
            }, animateSpeed);
          });
        });
      }
      e.preventDefault();
    });

    // Forward button in single product
    $('#single-product .forward').click(function(e){

      var animateSpeed = 200;
      
      if(settings.useHistory){
		var state = History.getState();
	  }
	  else
	  {
		var state = {};
		state.data = {};
		state.data.action = 'loadsingle';
		state.data.id = currentItemID;
	  }

      if(state.data.action === 'loadsingle') {
        $('#single-product .product').css({
          'right' : 'auto'
        }).animate({
          'left' : 20
        }, animateSpeed, function(){
          $('#single-product .product').animate({
            'left' : -50,
            'opacity' : 0
          }, animateSpeed, function(){
            var item = $("#" + state.data.id);
            var next = item.next();
            if (!next.length && item.parent().next().length) {
              next = item.parent().next().children(":first-child");
            } else if(!next.length) {
              next = $('#result .item').first();
            }
            if (next.length) {
              var object = {
                id: next.attr('id'),
                index: next.attr('data-index'),
                action: 'loadsingle'
              };
              if(settings.useHistory)
		      {
		      	History.pushState(object, '', '?package=' + object.id);
		      }
		      else
		      {
		      	currentItemID = object.id;
		      	pwOpenSingleProduct(object.index);
		      }
            }
            $('#single-product .product').css({
              'left' : 20
            }).animate({
              'left' : 0,
              'opacity' : 1
            }, animateSpeed);
          });
        });
      }
      e.preventDefault();
    });
  }

  function pwBuildItemDOM() {
    return;
    var html = [];
    for (var i=0; i < packages.length; i++) {
      var item = packages[i];
      html.push('<div id="' + item.id + '" class="item" data-index="' + i + '"><a href="#"><img src=""></a><div class="extra-info"><h3>' + item.name + '</h3><p>' + item.description + '<br>' + item.producer + '</p></div></div>');
    }
    $('#result-inner').html(html.join(''));
  }

  // pwSetActiveFilters()
  // A helper function that sets selected filters to active/not active.
  function pwSetActiveFilters(filters) {
    $('#filter input[type="checkbox"]').each(function(){
      var id = $(this).attr('data-id');
      var inArray = $.inArray(id, filters);
      if(inArray !== -1) {
        $(this).prop('checked', true);
      }
    });

    $('#filter .main-cat').each(function(){
      var maincat = $(this).parent();
      maincat.find('.main-cat').removeClass('partial');
      var subcbchecked = maincat.find('.subcb:checked').length;
      var subcb = maincat.find('.subcb').length;

      if(subcb != 0) {
        if(subcb == subcbchecked) {
          maincat.find('.maincb').prop('checked', true);
        } else if(subcbchecked != 0 && subcb > subcbchecked) {
          maincat.find('.main-cat').addClass('partial');
        }
      }
    });

    // Update helpers and run if we're initializing the app
    pwGetCurrentSelection();
    pwSenseActiveFilters();
    if(init) { pwFilterProducts(); }
  }

  function pwClearFilters() {
    $('#filter input[type="checkbox"]').attr('checked', false);
    $('#filter .partial').removeClass('partial');
    pwSenseActiveFilters();
    pwGetCurrentSelection();
  }

  // pwSenseActiveFilters()
  // Updates #number-of-matches with the amount of the current
  // selection. Also updates the active filters below each filter list.
  // Deactivates GO-button if we have 0 matches.
  // Adding a slight timeout just in case some browsers
  // don't register the click event at once to prevent us from
  // getting the old data.
  function pwSenseActiveFilters() {
    setTimeout(function() {
      var amount = currentSelection.length;
      $('#number-of-matches').text(amount + ' matches')

      if(amount == 0) {
        $('#filter #set-filter').addClass('inactive');
      } else {
        $('#filter #set-filter').removeClass('inactive');
      }

      $('#filter .col').each(function(){
        var vals = '';
        var valArray = [];
        var hasChecked = $(this).find('input[type=checkbox]').is(':checked');
        if(hasChecked) {
          $(this).find('input[type=checkbox].maincb:checked').each(function(){
            var val = $(this).siblings('a').text();
            if(!val) {
              val = $(this).closest('.main-cat').text();
            }
            vals = vals + ' + ' + val;
          });
          $(this).find('input[type=checkbox].maincb').not(':checked').closest('li').find('ul input[type=checkbox]:checked').each(function(){
            var val = $(this).closest('label').text();
            vals = vals + ' + ' + val;
          });
          vals = vals.substring(3);
          valArray = vals.split('+');
          vals = valArray[0];
          if(valArray.length > 1) {
            vals = vals + ' + ' + parseInt(valArray.length-1);
          }
        } else {
          vals = 'Any';
        }
        $(this).find('.current-selection').text(vals);
      });
    }, 20);
  }

  // pwPopulateFilter()
  // Use to populate the different filters.
  function pwPopulateFilter(jsondata) {
    var iterator = jsondata;
    if(jsondata[0].name == 'Shape') { iterator = jsondata[0].sub; }
    var ulmain = $('<ul class="main" />');

    for (var i=0; i < iterator.length; i++) {
      var data = jsondata[i];
      var mainvalue = '';
      var mainid = '';
      if(jsondata[0].name == 'Shape') {
        data = jsondata[0].sub[i];
        mainvalue = 'value="'+data.data+'"';
        mainid = 'data-id="'+data.id+'"';
        var subtoggle = data.name;
      } else {
        var subtoggle = '<a href="#" class="subtoggle">' + data.name + '</a>';
      }

      var mainli = $('<li />');
      ulmain.append(mainli);
      mainli.append('<div class="main-cat">'+ subtoggle +'<input '+ mainid +' type="checkbox" class="maincb" ' + mainvalue + ' /></div>');
      if(data.sub) {
        var ulsub = $('<ul />');
        mainli.append(ulsub);
        for (var j=0; j < data.sub.length; j++) {
          ulsub.append('<li><label>' + data.sub[j].name + '<input data-id="'+ data.sub[j].id +'" type="checkbox" class="subcb" value="' + data.sub[j].data + '" /></label></li>');
        }
      }
    }
    return ulmain;
  }

  // pwMenuToggle()
  // Open/closes menu and sets header appropriately. All animations
  // are handled with CSS transitions.
  function pwMenuToggle() {
    var filter = $('#filter');
    filter.toggleClass('open');
    $('body').toggleClass('filter-closed');
    filter.find('#filter-header .icon').toggleClass('arrow-up').toggleClass('arrow-down');

    setTimeout(function() {
      var isOpen = filter.hasClass('open');
      var hasChecked = filter.find('input[type=checkbox]').is(':checked');
      if(!isOpen && !hasChecked) {
        filter.find('#filter-header a b').text('Create your own selection of packages');
      } else if(!isOpen && hasChecked) {
        filter.find('#filter-header a b').text('My selection of packages');
      } else if(isOpen) {
        filter.find('#filter-header a b').text('Hide my selection');
      }
    }, 20);
  }

  // pwGetCurrentSelection()
  // Fills currentSelection with ids of all selected products
  function pwGetCurrentSelection() {
    if($('#filter input[type=checkbox]').is(':checked')) {
      var vals = pwGetColVals(null, 'category');
      vals = pwGetColVals(vals, 'volume');
      vals = pwGetColVals(vals, 'type');
      vals = pwGetColVals(vals, 'location');
      vals = pwGetColVals(vals, 'shape');
      currentSelection = objToArr(vals);
    } else {
      currentSelection = [];
      for (var i=0; i < packages.length; i++) {
        currentSelection[i] = i;
      }
    }
  }

  function objToArr(obj) {
    var arr = [];
    if (!obj) return arr;
    for (var item in obj)
      arr.push(item);
    return arr;
  }

  function stringToObj(s) {
    if (s.length == 0) return {};
    s = s.replace(/,/g, '":null,"');
    s = s.substring(0, s.length-2);
    return $.parseJSON('{"' + s + '}');
  }


  // pwAppendColVals()
  // Support function to get selected values
  function pwGetColVals(currvals, colid) {
    var checkedCbs = $("#" + colid + " input:checked");
    if (checkedCbs.length == 0) {
      return currvals;
    }

    var newvals = '';
    checkedCbs.each(function(){
      var avals = $(this).val();
      if (avals.length > 0 && avals != 'on') {
        newvals += avals + ",";
      }
    });
    var newvalsobj = stringToObj(newvals);

    if (currvals == null) {
      return newvalsobj;
    }

    var vals = {};
    for (var item in currvals) {
      if (newvalsobj.hasOwnProperty(item))
        vals[item] = null;
    }

    return vals;
  }

  // pwFilterProducts()
  // Is run when we hit Go! Fetches all packages and then loads the appropriate ones.
  // Note: If we set filters from different main categories (category, volume, type, location) we only want items containing BOTH selected variables.
  // Within a category, the filters are additive. Category: food && Category: Milk === all products from both ranges, NOT products containing both.
  // A product can only be within one main/sub category pair.
  function pwFilterProducts() {
    if($('#filter input[type=checkbox]').is(':checked')) {
      $('#filter').removeClass('has-selection').addClass('has-selection');
    } else {
      $('#filter').removeClass('has-selection');
    }
    pwBuildLayout();
  }


  // -----------------
  // Layout
  // -----------------

  // pwBuildLayout()
  // Senses size of viewport and number of products and sets
  // up proper layout. In the end it loads the first page.
  //
  // This function works independently from pwFilterProducts(). We can
  // call it whenever we want - it works with the existing data and sets
  // the proper layout from there. This keeps us from having to make a
  // new product load on resize, for instance.
  function pwBuildLayout() {
    var resultWrap = $('#result-inner');
    var gridClass = '';

    // Set up all proper variables so we can paginate
    pwViewportWidth = jQuery('body').outerWidth();
    pwProductAmount = currentSelection.length;

    if(pwViewportWidth >= 1170) { // Large layout
      if(pwProductAmount <= settings.gridlimit.large.oneline) {
        pwProductsPerPage = 4;
        gridClass = 'large oneline';
      } else if(pwProductAmount <= settings.gridlimit.large.twoline) {
        pwProductsPerPage = 16;
        gridClass = 'large twoline';
      } else {
        pwProductsPerPage = 36;
        gridClass = 'large threeline';
      }
    } else { // Small layout
      if(pwProductAmount <= settings.gridlimit.small.oneline) {
        pwProductsPerPage = 3;
        gridClass = 'small oneline';
      } else if(pwProductAmount <= settings.gridlimit.small.twoline) {
        pwProductsPerPage = 12;
        gridClass = 'small twoline';
      } else {
        pwProductsPerPage = 27;
        gridClass = 'small threeline';
      }
    }

    pwTotalPages = pwProductAmount/pwProductsPerPage;

    if(pwTotalPages % 1 === 0) {
      pwTotalPages = pwTotalPages-1;
    } else {
      pwTotalPages = Math.floor(pwTotalPages);
    }

    resultWrap.closest('#result').attr('class', '').addClass(gridClass);

    pwLoadPage(0);
  }

  // pwLoadPage(index)
  // Loads the page with the index you feed the function.
  function pwLoadPage(index) {
    var startitem = (index*pwProductsPerPage);
    var enditem = (index*pwProductsPerPage)+(pwProductsPerPage-1);

    if(enditem >= pwProductAmount) {
      enditem = pwProductAmount-1;
    }

    var html = [];

    for (var i=startitem; i <= enditem; i++) {
      var item = packages[currentSelection[i]];
      html.push('<div id="' + item.id + '" class="item" data-index="' + currentSelection[i] + '"><a href="#"><img src=""></a><div class="extra-info"><h3>' + item.name + '</h3><p>' + (item.type_sub + " " + item.volume_units) + '<br>' + item.category_sub + '<br>' + item.geo_country + '</p></div></div>');
    }
    $('#result-inner .page').html(html.join(''));

    if($('#result').hasClass('oneline')) {
      var imageSuffix = settings.imagesuffix.oneline;
    } else if($('#result').hasClass('twoline')) {
      var imageSuffix = settings.imagesuffix.twoline;
    } else {
      var imageSuffix = settings.imagesuffix.threeline;
    }

    setLeftClasses();

    $('#result-inner').find('.item').each(function(){
      var item = $(this);
      if(item.find('img').attr('src') == '') {
        var id = $(this).attr('id').substring(1);
        $(this).find('img').attr('src', settings.imagepath + id + imageSuffix);
      }
      var time = Math.random()*500;
      setTimeout(function() {
        item.find('img').animate({
          'opacity' : 1
        }, 300);
      }, time);
      $(this).find('a').click(function(e){
        var object = {};
        object.id = $(this).parent().attr('id');
        object.index = $(this).parent().attr('data-index');
        object.action = 'loadsingle';
	    if(settings.useHistory)
	    {
	    	History.pushState(object, '', '?package=' + object.id);
	    }
	    else
	    {
	    	currentItemID = object.id;
	    	pwOpenSingleProduct(object.index);
	    }        
        e.preventDefault();
      });
    });

    // Vertical align extra-info tooltip
    $('.extra-info').each(function() {
      $this = $(this);
      $this.css('margin-top', -$this.height()/2+'px');
      $this.addClass('height-calculated');
    })

    $('.extra-info').mousemove(function(e) {
      var $this = $(this),
          parent = $this.parent(),
          img = $(parent.find('img')[0]),
          leftOffset = parent.offset().left+parent.width();

      img.addClass('active');

      if( e.clientX > leftOffset || e.clientX < parent.offset().left ) {
        $this.hide();
        img.removeClass('active');
        setTimeout(function() {$this.show() }, 100 )
      }

    })

    pwBuildPager(parseInt(index, 10));
  }

  // setLeftClasses()
  // Adds classes to position infoboxes properly with css.
  // Used to do this with selectivizr.js, but it had horrible
  // performance in IE8.
  function setLeftClasses() {

    var result = $('#result');
    result.find('.page .item').removeClass('left');

    if(result.hasClass('oneline') && result.hasClass('small')) {
      $('#result.small.oneline .page .item:nth-child(3)').addClass('left');
    } else if(result.hasClass('oneline') && result.hasClass('large')) {
      $('#result.large.oneline .item:nth-child(n+3):nth-child(-n+4)').addClass('left');
    } else if(result.hasClass('twoline') && result.hasClass('small')) {
      $('#result.small.twoline .item:nth-child(n+4):nth-child(-n+8), #result.small.twoline .item:nth-child(n+10):nth-child(-n+12)').addClass('left');
    } else if(result.hasClass('twoline') && result.hasClass('large')) {
      $('#result.large.twoline .item:nth-child(n+5):nth-child(-n+8), #result.large.twoline .item:nth-child(n+13):nth-child(-n+16)').addClass('left');
    } else if(result.hasClass('threeline') && result.hasClass('small')) {
      $('#result.small.threeline .item:nth-child(n+5):nth-child(-n+9), #result.small.threeline .item:nth-child(n+14):nth-child(-n+18), #result.small.threeline .item:nth-child(n+23):nth-child(-n+27)').addClass('left');
    } else if(result.hasClass('threeline') && result.hasClass('large')) {
      $('#result.large.threeline .item:nth-child(n+7):nth-child(-n+12), #result.large.threeline .item:nth-child(n+19):nth-child(-n+24), #result.large.threeline .item:nth-child(n+31):nth-child(-n+36)').addClass('left');
    }
  }

  // pwBuildPager()
  // Builds the pager. Must be done on every page load
  // since the numbers will differ.
  function pwBuildPager(activePage) {
    var paginationHTML = '';
    var paginationHelperHTML = '';
    var prevMod = 1;
    var nextMod = 2;
    var firstProdOnPage = '';
    var lastProdOnPage = '';

    // Pagination helper
    lastProdOnPage = pwProductsPerPage * (activePage+1);
    firstProdOnPage = lastProdOnPage - (pwProductsPerPage) + 1;

    if(activePage === pwTotalPages) {
      lastProdOnPage = pwProductAmount;
    }

    $('#pagination-helper').text('Showing ' + firstProdOnPage + ' to ' + lastProdOnPage + ' of ' + pwProductAmount);

    // Pagination
    if(pwTotalPages >= 1) {
      if(pwTotalPages <= 7) {
        for (var i=0; i <= parseInt(pwTotalPages); i++) {
          if(i === activePage) {
            paginationHTML = paginationHTML + '<span>' + parseInt(i+1) + '</span>';
          } else {
            paginationHTML = paginationHTML + '<a href="#" data-loadpage="' + i + '">' + parseInt(i+1) + '</a>';
          }
        }
      } else {
        if(activePage <= 4) {
          nextMod = 5-activePage;
          prevMod = activePage;
        } if(activePage >= (pwTotalPages-4)) {
          nextMod = activePage;
          prevMod = activePage-(pwTotalPages-4);
        }

        for (var i=parseInt(activePage-prevMod); i < parseInt(activePage+nextMod); i++) {
          if(i >= 0 && i <= pwTotalPages) {
            if(i === activePage) {
              paginationHTML = paginationHTML + '<span>' + parseInt(i+1) + '</span>';
            } else {
              paginationHTML = paginationHTML + '<a href="#" data-loadpage="' + i + '">' + parseInt(i+1) + '</a>';
            }
          }
        }
      }

      if(activePage != 0) {
        if(paginationHTML.indexOf('data-loadpage="0"') == -1 && paginationHTML.indexOf('<span>0</span>') == -1 && activePage > 3) {
          paginationHTML = '<a href="#" data-loadpage="0">1</a><span class="filler">...</span>' + paginationHTML;
        }
      }

      if(activePage != pwTotalPages) {
        if(paginationHTML.indexOf('data-loadpage="'+pwTotalPages+'"') == -1 && paginationHTML.indexOf('<span>'+pwTotalPages+'</span>') == -1 && activePage < parseInt(pwTotalPages-3)) {
          paginationHTML = paginationHTML + '<span class="filler">...</span><a href="#" data-loadpage="'+pwTotalPages+'">' + parseInt(pwTotalPages+1) + '</a>';
        }
      }
    }

    if(activePage != 0) {
      paginationHTML = '<a href="#" class="prev" data-loadpage="'+ parseInt(activePage-1) +'">Previous</a>' + paginationHTML;
    } else {
      paginationHTML = '<span class="prev">Previous</span>' + paginationHTML;
    }

    if(activePage != pwTotalPages) {
      paginationHTML = paginationHTML + '<a href="#" class="next" data-loadpage="'+ parseInt(activePage+1) +'">Next</a>';
    } else {
      paginationHTML = paginationHTML + '<span class="next">Next</span>';
    }

    $('#pagination').html(paginationHTML);

    $('#pagination a').click(function(e){
      var pageNumber = $(this).attr('data-loadpage');
      pwLoadPage(pageNumber);
      e.preventDefault();
    });
  }


  // -----------------
  // Single product
  // -----------------

  function pwOpenSingleProduct(index) {
  	
    var $singleProduct = $('#single-product');
    var id = packages[index].id.substring(1);
    var name = packages[index].name;
    var img = settings.imagepath + id + settings.imagesuffix.singleprod;
    var preloadimg = 'img/loader.gif';
    var producer = packages[index].producer;
    var description = packages[index].description;
    var category = packages[index].category_sub;
    var country = packages[index].geo_country;
    var packaging = packages[index].type_sub + " " + packages[index].volume_units;
    var contactMe = settings.contactme;
    var externalLink = false; // placeholder: update with external link url when available

    $singleProduct.find('#preloader').css({ 'opacity': 1 });
    $singleProduct.find('#product-image').css({ 'opacity': 0 }).attr('src', img).load(function(){
      $singleProduct.find('#product-image').css({ 'opacity': 1 });
      $singleProduct.find('#preloader').css({ 'opacity': 0 });
    });

    $singleProduct.find('.information .title').text(name)
    $singleProduct.find('.packaging span').text(packaging)
    $singleProduct.find('.category span').text(category)
    $singleProduct.find('.brand span').text(producer)
    $singleProduct.find('.country span').text(country)
    $singleProduct.find('.text').text(description)

    if(contactMe) {
      $singleProduct.find('.contact').show().find('a').attr('href', contactMe);
    } else {
      $singleProduct.find('.contact').hide();
    }

    if(externalLink) {
      $singleProduct.find('.external').show().find('a').attr('href', externalLink);
    } else {
      $singleProduct.find('.external').hide();
    }

    $('#resultlist').addClass('hidden');
    $singleProduct.removeClass('hidden');

  }

  function pwCloseSingleProduct() {
    $('#resultlist').removeClass('hidden');
    $('#single-product').addClass('hidden');
  }


  // -----------------
  // Paths
  // -----------------

  // Setting up history.js - see
  // https://github.com/balupton/History.js/
  if(!History.enabled) { return false; }

  function pwPathInit() {
    History.Adapter.bind(window, 'statechange', function(){ pwExecuteState(); });
    pwExecuteState();
  }

  function pwExecuteState() {
    var state = History.getState();
    if(state.data.action === 'loadsingle') {
      pwOpenSingleProduct(state.data.index);
    } else if(state.data.action === 'closesingle') {
      pwCloseSingleProduct();
    } else if(state.data.action === 'setfilter') {
      pwSetActiveFilters(state.data.filters);
    } else if(state.data.action === 'clearfilter') {
      pwClearFilters();
    } else {
      var split = state.hashedUrl.split('&');
      var setfilters = split[0].match(/setFilters/);
      if(setfilters != null) {
        var filterstrings = setfilters.input.substring(setfilters.index+setfilters[0].length+1, setfilters.input.length).split(',');
        var filters = [];
        for(var i = 0; i < filterstrings.length; i++) {
          filters.push(filterstrings[i]);
        }
        pwSetActiveFilters(filters);
      }
    }
  }


  // -----------------
  // Welcome message
  // -----------------

  function pwMessageInit() {
    var state = History.getState();
    var split = state.hashedUrl.split('&');
    var setfilters = split[0].match(/setFilters/);
    if(state.data.action != 'loadsingle' && setfilters == null) {
      $('#overlay-message').html(settings.startmessage);
      $('#overlay, #overlay-message').addClass('visible');
      $('body').removeClass('filter-closed');
      $('#overlay, #overlay-message').click(function(){
        $('#overlay, #overlay-message').removeClass('visible');
        $('body').addClass('filter-closed');
      });
    }
  }


  // -----------------
  // Let's run this!
  // -----------------

  jQuery(document).ready(function() {
    $("body").prepend("<div id='debug' style='position:absolute'></div>");
    pwMenuInit();
    $(window).resize(function(){
      clearTimeout(pwResizeTimeout);
      pwResizeTimeout = setTimeout(function(){
        pwBuildLayout();
      }, 100);
    });
    pwPathInit();
    pwMessageInit();
    init = false;
  });


function debug(txt) {
  var now = new Date();
  var snow = now.getSeconds() + "." + now.getMilliseconds();
  var s = $("#debug").html();
  $("#debug").html(s + "<br />" + txt + " - " + snow);
}

}());