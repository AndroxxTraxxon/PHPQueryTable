/*!
 * PHPQueryTable v 0.0.1
 * Copyright (c) David Culbreth 2017
 * Licensed under MIT
 */

 /**
  * Some comventions in this script:
  * Variables that are jQuery objects have names proceeded by a '$' (because jQuery is $)
  */

/**
 * @description
 * Intended to be used in conjunction with the
 * SQLSRV library in PHP -
 * Tested with PHP 7.0.21 and Chrome 61.0.3163.91 (Official Build) (64-bit) (cohort: 61_Win_91)
 * @version 0.0.1
 * @author David Culbreth
 */

class PHPQueryTable {
  constructor(rootElement, options){
    if (typeof jQuery === 'undefined') {
      throw new Error('PHPQueryTable requires jQuery library.');
    }
    this.data = undefined;
    this.metadata = undefined;
    this.editedRows = [];
    this.deletedRows = [];
    this.pendingRowRequests = [];
    this.nav_drawn = false;
    var defaults = {
      url: undefined,
      inputClass: 'form-control input-sm',
      toolbarClass: 'btn-toolbar',
      groupClass: 'btn-group btn-group-sm',
      dangerClass: 'danger',
      warningClass: 'warning',
      mutedClass: 'text-muted',
      eventType: 'click',
      rowIdentifier: 'id',
      hideIdentifier: false,
      toolbar: true,
      autoFocus: true,
      editButton: true,
      deleteButton: true,
      saveButton: true,
      restoreButton: true,
      refreshButton: false,
      rowNumberer: false,
      newLine: false,
      buttons: {
        edit: {
            class: 'btn btn-sm btn-default',
            html: '<i class = "fa fa-pencil-square-o fa-2x"></i>',
            action: 'edit'
        },
        delete: {
            class: 'btn btn-sm btn-default',
            html: '<i class = "fa fa-trash-o fa-2x"></i>',
            action: 'delete'
        },
        save: {
            class: 'btn btn-sm btn-success',
            html: 'Save'
        },
        restore: {
            class: 'btn btn-sm btn-warning',
            html: 'Restore',
            action: 'restore'
        },
        confirm: {
            class: 'btn btn-sm btn-danger',
            html: 'Confirm'
        },
        update: {
          class: 'btn btn-sm btn-default',
          html: '<i class = "fa fa-refresh fa-2x"></i>'
        },
        newLine: {
          class: 'btn btn-sm btn-success',
          html: '<i class = "fa fa-plus-circle fa-2x"></i>'
        },
        lastPage: {
          class: 'btn btn-sm btn-primary',
          html: '<i class = "fa fa-fast-forward fa-2x"></i>'
        },
        nextPage: {
          class: 'btn btn-sm btn-primary',
          html: '<i class = "fa fa-step-forward fa-2x"></i>'
        },
        prevPage: {
          class: 'btn btn-sm btn-primary',
          html: '<i class = "fa fa-step-backward fa-2x"></i>'
        },
        firstPage: {
          class: 'btn btn-sm btn-primary',
          html: '<i class = "fa fa-fast-backward fa-2x"></i>'
        }

      },
      formats: {
        date: 'MM/DD/YYYY'
      },
      onLoad: function() { return; },
      onDraw: function() { return; },
      onSuccess: function() { return; },
      onFail: function() { return; },
      onAlways: function() { return; },
      onAjax: function() { return; },
      useDefaultColumnNames: true,
      rootElementType: "div",
      pageLength: 20,
      pageNo: 1,
      idIndex: -1,
      editable: false,
      sortColumn: null,
      debug: false

    };
    this.settings = $.extend(true, defaults, options);

    this.$root = rootElement;

    if(!this.$root.is(this.settings.rootElementType)){
      this.settings.rootElementType = this.$root.prop("nodeName");
      console.warn("This class is intended to be used in a div. Proceeding inside " + this.settings.rootElementType);
    }

    if(this.settings.rootElementType !== "table"){
      this.$table = $(document.createElement("table"));
      this.$root.append(this.$table);
    }else{
      this.$table = this.$root;
    }
    if(!this.$table.hasClass("table")){
      this.$table.addClass("table");
    }
    if(!this.$table.hasClass("table-striped")){
      this.$table.addClass("table-striped");
    }
    if(this.settings.eventType === "dblclick"){
      this.$table.css(".table.user-select-none",
      "-webkit-touch-callout: none;\
      -webkit-user-select: none;\
      -khtml-user-select: none;\
      -moz-user-select: none;\
      -ms-user-select: none;\
      user-select: none;");
      this.settings.editButton = false;
    }
    if(this.settings.columns !== undefined && Array.isArray(this.settings.columns) && this.settings.columns[0].Name !== undefined){
      this.settings.useDefaultColumnNames = false;
    }


   this.$table.parent().css("overflow-x", "auto");
    // Add event triggers for buttons
    var $table = this.$table;
    var PQT = this;
    if(this.settings.editable){
      if(this.settings.editButton){
        $table.on('click', 'button.PQT-edit-button', function(event) {
            if (event.handled !== true) {
                event.preventDefault();
                var $button = $(this);
                // Get current state before reset to view mode.
                var activated = $button.hasClass('active');
                // Change to view mode columns that are in edit mode.
                PQT.editReset($table.find('td.PQT-edit-mode'));
                if (!activated) {
                    // Change to edit mode for all columns in reverse way.
                    $($button.parents('tr').find('td.PQT-view-mode').get().reverse()).each(function() {
                        PQT.editMode(this);
                    });
                }

                event.handled = true;
            }
        });
        $table.on('click', 'button.PQT-save-button', function(event) {
            if (event.handled !== true) {
                event.preventDefault();
                // Submit and update all columns.
                PQT.confirmEdit($(this).parents('tr').find('td.PQT-edit-mode'));
                event.handled = true;
            }
        });
      }
      else{
        $table.on('change', 'select.PQT-input:visible', function(event){
          if(event.handled !== true){
            // Record an edited column.
            PQT.confirmEdit($(this).parent('td'));
            event.handled = true;
          }
        });
        $table.on(this.settings.eventType, 'tr:not(.PQT-deleted-row) td.PQT-view-mode', function(event) {
            if (event.handled !== true) {
                event.preventDefault();
                // Reset all td's in edit mode.
                PQT.editReset($table.find('td.PQT-edit-mode'));
                // Change to edit mode.
                PQT.editMode(this);
                event.handled = true;
            }
        });
        $(document).on('click', function(event){
          var $editMode = $table.find('.PQT-edit-mode');
          if(!$editMode.is(event.target) && $editMode.has(event.target).length === 0){
            PQT.editReset($table.find('.PQT-input:visible').parent('td'));
          }
        });
        $(document).on('keyup', function(event) {
          // Get input element with focus or confirmation button
          var $input = $table.find('.PQT-input:visible');
          var $button = $table.find('.PQT-confirm-button');
          var $td = undefined;
          if($input.length > 0){
            $td = $input.parents('td');
          } else if($button.length > 0){
            $td = $button.parents('td');
          } else {
            return;
          }
          switch(event.keyCode) {
            case 9: // Tab
              PQT.confirmEdit($td);
              if(event.shiftKey){
                PQT.editMode($td.closest('td').prev());
              } else {
                PQT.editMode($td.closest('td').next());
              }
              break;
            case 13: // Return/Enter
              PQT.confirmEdit($td);
              if(event.shiftKey){
                //go up one row
                PQT.editMode($td.parent('tr').closest('tr').prev().find('td:nth-child('+$td[0].cellIndex +1+')'));
              } else {
                // go down one row
                PQT.editMode($td.parent('tr').closest('tr').next().find('td:nth-child('+$td[0].cellIndex +1+')'));
              }
              break;
            case 27: // Escape
              PQT.editReset($td);
              PQT.resetDeleteButton($td);
            break;
          }
        });
      }
      if(this.settings.deleteButton){
        $table.on('click', 'button.PQT-delete-button', function(event){
          if(event.handled !== true){
            event.preventDefault();
            PQT.showConfirmDeleteButton($(this).parents('td'));
            event.handled = true;
          }
        });
        $table.on('click', 'button.PQT-confirm-button', function(event){
          if(event.handled !== true){
            event.preventDefault();
            PQT.confirmDelete($(this).parents('td'));
            event.handled = true;
          }
        });
      }
    }
    $table.on('click', 'th.PQT-header-column', function(event){
      if(event.handled !== true){
        var column = parseInt(this.id.replace('Column-', ''));
        if(PQT.settings.sortColumn == column && !PQT.settings.reverseSort){
          PQT.settings.reverseSort = true;
        }else{
          PQT.settings.sortColumn = column;
          PQT.settings.reverseSort = false;

        }
        if (PQT.settings.debug == true){
          console.log("Sorting by " + PQT.metadata[PQT.settings.sortColumn].Name + " in " + ((PQT.settings.reverseSort)?"reverse ":"") + "order.");
        }
        PQT.sortData();
        event.handled = true;
      }
    });

    if(this.settings.url !== undefined){
      this.pull();
    }
    else if( this.data !== undefined && this.metadata !== undefined){
      this.draw();
    }
  }
  drawPQTNav(){
    var PQT = this;
    var $nav;
    if(this.nav_drawn){
      $nav = $('div.row.PQT-nav');
      $nav.html("");
      $("div.row.PQT-nav").show();
    }else{
      var $nav = $(document.createElement("div"));
      $nav.addClass("row PQT-nav");
      $("#PQT-nav-pageNo").val(PQT.settings.pageNo);
    }
    var $center = $(document.createElement("center"));
    var first_btn = '<button type="button" class = "PQT-nav-first '+PQT.settings.buttons.firstPage.class+'" style="float: none; disabled">' + PQT.settings.buttons.firstPage.html + '</button>';
    $center.append(first_btn);
    var prev_btn = '<button type="button" class = "PQT-nav-prev '+PQT.settings.buttons.prevPage.class+'" style="float: none; disabled">' + PQT.settings.buttons.prevPage.html + '</button>';
    $center.append(prev_btn);
    var input = '<span id = "PQT-nav-Pageno-span"> Page <input type ="number" id="PQT-nav-pageNo" value='+PQT.settings.pageNo+' style="width:'+(30 + Math.floor(Math.log(PQT.data.length))*5 * Math.LOG10E)+'px;"></input> of '+(Math.ceil(1.0*PQT.data.length/PQT.settings.pageLength)) + '&nbsp;</span>';
    $center.append(input);
    var next_btn = '<button type="button" class = "PQT-nav-next '+PQT.settings.buttons.nextPage.class+'" style="float: none;">' + PQT.settings.buttons.nextPage.html + '</button>';
    $center.append(next_btn);
    var last_btn = '<button type="button" class = "PQT-nav-last '+PQT.settings.buttons.lastPage.class+'" style="float: none;">' + PQT.settings.buttons.lastPage.html + '</button>';
    $center.append(last_btn);
    $nav.append($center);
    PQT.$table.after($nav);
    PQT.nav_drawn = true;
  }

  draw(){
    this.$table.html("");
    var $table = this.$table;
    var obj = this;
    var settings = this.settings;
    if (obj.metadata !== undefined && obj.metadata.length == 0){
      return;
    }

    for(var i = 0; i < this.metadata.length; i++){
      if(this.metadata[i].Name == this.settings.rowIdentifier){
        this.settings.idIndex = i;
        break;
      }
    }
    //draw the header.
    var head = document.createElement("thead");
    var headRow = document.createElement("tr");
    if(obj.settings.rowNumberer){
      var numberer = document.createElement("th");
      numberer.innerHTML = "#";
      numberer.className = "PQT-header";
      headRow.appendChild(numberer);
    }
    for(var i = 0; i < obj.metadata.length; i++){
      var element = document.createElement("th");
      if(obj.settings.useDefaultColumnNames){
        element.innerHTML = obj.metadata[i].Name;
      }else{
        if(typeof(obj.settings.columns[i].Name) === undefined || i > obj.settings.columns.length){
          throw new Error("Column "+i+" Name Invalid");
        }
        element.innerHTML = obj.settings.columns[i].Name;
      }
      element.id = "Column-"+i;
      element.className = "PQT-header PQT-header-column";
      headRow.appendChild(element);
    }
    head.appendChild(headRow);
    $table.append(head);

    // Draw the body
    var body = document.createElement("tbody");
    //clamping start index between 0 and length of data
    var startDataIndex = Math.max(0,Math.min((obj.settings.pageNo-1) * obj.settings.pageLength, obj.data.length - obj.settings.pageLength));
    var endDataIndex = Math.min(startDataIndex + obj.settings.pageLength, obj.data.length);
    for(var i = startDataIndex ; i < endDataIndex; i ++){
      var row = document.createElement("tr");
      if(obj.settings.rowNumberer){
        var rowNumberer = document.createElement("td");
        rowNumberer.innerHTML = i+1;
        row.appendChild(rowNumberer);
      }
      for(var j = 0; j < obj.metadata.length; j++){
        var element = document.createElement("td");
        var type = obj.metadata[j].Type;
        if (type == 91 && obj.data[i][obj.metadata[j].Name]!== null){ // date type
          obj.data[i][obj.metadata[j].Name].dateObj = new Date(obj.data[i][obj.metadata[j].Name].date);
          element.innerHTML = moment(obj.data[i][obj.metadata[j].Name].dateObj).format(obj.settings.formats.date);
        }else{
          element.innerHTML = obj.data[i][obj.metadata[j].Name];
        }
        row.appendChild(element);
      }
      body.appendChild(row);
    }
    $table.append(body);

    //TODO: define the table footer
    // var foot = document.createElement("tfoot");
    // $table.append(foot);
    // for(var i = 0; i < obj.metadata.length; i++){
    //
    // }
    //TODO: define the control panel underneath the table.
    if(obj.data.length > obj.settings.pageLength){
      obj.drawPQTNav();
      $("#PQT-nav-pageNo").change(function(){
        obj.settings.pageNo = Math.min(Math.ceil(1.0*obj.data.length/obj.settings.pageLength), $("#PQT-nav-pageNo").val());
        obj.draw();
      });
      $("button.PQT-nav-first").click(function(){
        obj.settings.pageNo = 1;
        obj.draw();
      });
      $("button.PQT-nav-prev").click(function(){
        obj.settings.pageNo = Math.max(1, obj.settings.pageNo-1);
        obj.draw();
      });
      $("button.PQT-nav-next").click(function(){
        obj.settings.pageNo = Math.min(Math.ceil(1.0*obj.data.length/obj.settings.pageLength), obj.settings.pageNo + 1);
        obj.draw();
      });
      $("button.PQT-nav-last").click(function(){
        obj.settings.pageNo = Math.ceil(1.0*obj.data.length/obj.settings.pageLength);
        obj.draw();
      });
    }else{
      $("div.row.PQT-nav").hide();
    }
    if(obj.settings.editable && (obj.settings.editButton || obj.settings.deleteButton)){
      //write in submit button and cancel button.
    }
    //now that the table is created, do some PQT stuff
    var realIDLoc = obj.settings.idIndex + 1;
    if(obj.settings.rowNumberer){
      realIDLoc++;
    }

    if(obj.settings.hideIdentifier){
      $table.find('th:nth-child(' + (realIDLoc) + '), tbody td:nth-child(' + (realIDLoc) + ')').hide();
    }

    $table.find(".PQT-header-column").each(function(){
      if(this.id.indexOf('Column-') > -1){
        var column = parseInt(this.id.replace("Column-", ""));
        if(column == obj.settings.sortColumn){
          $(this).addClass("PQT-sort-column");
          var icon = "";
          if(obj.settings.reverseSort){
            icon = '&nbsp;<i class = "fa fa-sort-amount-desc fa-lg"></i>';
          }else{
            icon = '&nbsp;<i class = "fa fa-sort-amount-asc fa-lg"></i>';
          }
          $(this).html(obj.metadata[column].Name + icon);
        }
      }
    });


    var $td = $table.find('tbody td:nth-child(' + realIDLoc + ')');
    $td.each(function() {
        // Create hidden input with row identifier.
        var text = $(this).text();
        var span = '<span class="PQT-span PQT-identifier">' + text + '</span>';
        var input = "";
        if(obj.settings.editable){
          input = '<input class="PQT-input PQT-identifier" type="hidden" name="' + obj.metadata[this.index] + '" value="' + text + '" disabled>';
        }
        // Add elements to table cell.
        $(this).html(span + input);
        // Add attribute "id" to table row.
        $(this).parent('tr').attr('id', text);
    });
    if(obj.settings.editable){
      for(var i = 0; i < obj.metadata.length; i++){
        if(i != obj.settings.idIndex){
          var offset = 1;
          if(obj.settings.rowNumberer){
            offset = 2;
          }
          var $td = $table.find('tbody td:nth-child(' +(i + offset)+')');
          $td.each(function(){
            var text = $(this).text();
            if(obj.settings.editButton){
              $(this).css('cursor', 'pointer');
            }
            // Create span element.
            var input = '';
            var span = '<span class="PQT-span">' + text + '</span>';

            if(obj.settings.columns !== undefined && obj.settings.columns[i].type === 'select'){
              // Create select element.
              input += '<select class="PQT-input ' + obj.settings.inputClass + '" name="' + obj.metadata[i].Name + '" style="display: none;" disabled>'
              // Create options for select element.
              for(var j = 0; j < obj.settings.columns[i].options.length; j++){
                var value = obj.settings.columns[i].options[j];
                if(text === value){
                  input += '<option value="' + index + '" selected>' + value + '</option>';
                }else{
                  input += '<option value="' + index + '">' + value + '</option>';
                }
                // Close select element.
                input += '</select>';
              }

            } else {
              input += '<input class="PQT-input ' + obj.settings.inputClass + '" type="text" name="' + obj.metadata[i].Name + '" value="' + $(this).text() + '" style="display: none;" disabled>';
            }
            $(this).html(span + input);
            $(this).addClass('PQT-view-mode');
          });
        }
      }
      if(obj.settings.toolbar){
        if(obj.settings.editButton || obj.settings.deleteButton) {
          var editButton = '';
          var deleteButton = '';
          var saveButton = '';
          var restoreButton = '';
          var confirmButton = '';

          // Add toolbar column header if not exists.
          if ($table.find('th.PQT-toolbar-column').length === 0) {
            $table.find('tr:first').append('<th class="PQT-toolbar-column"></th>');
          }

          // Create edit button.
          if (obj.settings.editButton) {
            editButton = '<button type="button" class="PQT-edit-button ' + obj.settings.buttons.edit.class + '" style="float: none;">' + obj.settings.buttons.edit.html + '</button>';
          }

          // Create delete button.
          if (obj.settings.deleteButton) {
            deleteButton = '<button type="button" class="PQT-delete-button ' + obj.settings.buttons.delete.class + '" style="float: none;">' + obj.settings.buttons.delete.html + '</button>';
            confirmButton = '<button type="button" class="PQT-confirm-button ' + obj.settings.buttons.confirm.class + '" style="display: none; float: right;">' + obj.settings.buttons.confirm.html + '</button>';
          }

          // Create save button.
          if (obj.settings.editButton && obj.settings.saveButton) {
              saveButton = '<button type="button" class="PQT-save-button ' + obj.settings.buttons.save.class + '" style="display: none; float: none;">' +obj. settings.buttons.save.html + '</button>';
          }

          // Create restore button.
          if (settings.deleteButton && settings.restoreButton) {
              restoreButton = '<button type="button" class="PQT-restore-button ' + settings.buttons.restore.class + '" style="display: none; float: none;">' + settings.buttons.restore.html + '</button>';
          }



          var toolbar = '<div class="PQT-toolbar ' + settings.toolbarClass + '" style="text-align: left;">\n\
          <div class="' + settings.groupClass + '" style="float: none;">' + editButton + deleteButton + '</div>\n\
          ' + saveButton + '\n\
          ' + confirmButton + '\n\
          ' + restoreButton + '\n\
          </div></div>';

          // Add toolbar column cells.
          $table.find('tr:gt(0)').append('<td style="white-space: nowrap; width: 1%;">' + toolbar + '</td>');
        }
      }
    }
  }

  setColumnNames(options){
    if(!Array.isArray(options)){
      throw new Error("Cannot use non-array object for column Names");
    }
    if(options.length != metadata.length){
      console.warn("Input Column Names length != data column names length!");
    }
    for(var i = 0; i < this.settings.columns.length; i++){
      this.settings.columns[i].Name = options[i];
    }
    this.settings.useDefaultColumnNames = false;
  }

  viewMode(td){
    var $tr = $(td).parent('tr');
    // Hide and disable input element.
    $(td).find('.PQT-input').blur().hide().prop('disabled', true);
    // Show span element.
    $(td).find('.PQT-span').show();
    // Add "view" class and remove "edit" class in td element.
    $(td).addClass('PQT-view-mode').removeClass('PQT-edit-mode');
    // Update toolbar buttons.
    if (this.settings.editButton) {
        $tr.find('button.PQT-save-button').hide();
        $tr.find('button.PQT-edit-button').removeClass('active').blur();
    }
  }

  resetDeleteButton(td) {
    if(this.settings.editable){
      // Reset delete button to initial status.
      this.$table.find('.PQT-confirm-button').hide();
      // Remove "active" class in delete button.
     this.$table.find('.PQT-delete-button').removeClass('active').blur();
    }else{
      throw new Error("resetDeleteButton(td) is only available in when the PQT is editable.");
    }
  }

  editMode(td){
    if(this.settings.editable){
      this.resetDeleteButton(td);
      var $tr = $(td).parent('tr');
      $tr.find('.PQT-input.PQT-identifier').prop('disabled', false);

      $(td).find('.PQT-span').hide();
      // Get input element.
      var $input = $(td).find('.PQT-input');
      // Enable and show input element.
      $input.prop('disabled', false).show();
      // Focus on input element.
      if (this.settings.autoFocus) {
          $input.focus();
      }
      // Add "edit" class and remove "view" class in td element.
      $(td).addClass('PQT-edit-mode').removeClass('PQT-view-mode');
      // Update toolbar buttons.
      if (this.settings.editButton) {
          $tr.find('button.PQT-edit-button').addClass('active');
          if(this.settings.saveButton){
              $tr.find('button.PQT-save-button').show();
          }
      }

    }else{
      throw new Error("editMode(td) is only available in when the PQT is editable.");
    }
  }

  showConfirmDeleteButton(td){
    var obj = this;
    if(this.settings.editable){
      // Reset all cells in edit mode.
      if($(td).find('.PQT-delete-button').hasClass('active')){
        obj.resetDeleteButton(td);
        $(td).find('.PQT-delete-button').removeClass('active');
        // Show confirm button.
        $(td).find('.PQT-confirm-button').hide();

      }else{
        this.$table.find('td.PQT-edit-mode').each(function() {
            obj.editReset(this);
        });
        // Add "active" class in delete button.
        $(td).find('.PQT-delete-button').addClass('active');
        // Show confirm button.
        $(td).find('.PQT-confirm-button').show();
      }
    }else{
      throw new Error("showConfirmDeleteButton(td) is only available in when the PQT is editable.");
    }
  }
  confirmDelete(td) {
    if(this.settings.editable){
      this.resetDeleteButton(td);
      this.viewMode(td);
      $(td).parent('tr').hide();
      var id = $(td).parent('tr').find('input.PQT-identifier').prop('id');
      var index = this.deletedRows.indexOf(id);
      if(index == -1){
        this.deletedRows.push(id);
      }
      var index = this.editedRows.indexOf(id);
      if(index > -1){
        this.deletedRows.splice(index, 1);
      }
    }else{
      throw new Error("confirmDelete(td) is only available in when the PQT is editable.");
    }

  }
  editReset(td){
    var PQT = this;
    $(td).each(function() {
        // Get input element.
        var $input = $(this).find('.PQT-input');
        // Get span text.
        var text = $(this).find('.PQT-span').text();
        // Set input/select value with span text.
        if ($input.is('select')) {
            $input.find('option').filter(function() {
                return $.trim($(this).text()) === text;
            }).attr('selected', true);
        } else {
            $input.val(text);
        }
        // Change to view mode.
        PQT.viewMode(this);
    });
  }
  confirmEdit(td){
    var PQT = this;
    if(this.settings.editable){
      $(td).each(function() {
          // Get input element.
          var $input = $(this).find('.PQT-input');
          // Set span text with input/select new value.
          if ($input.is('select')) {
              $(this).find('.PQT-span').text($input.find('option:selected').text());
          } else {
              $(this).find('.PQT-span').text($input.val());
          }
          // Change to view mode.
          PQT.viewMode(this);
      });
      var id = $(td).parent('tr').prop('id');
      if(this.editedRows.indexOf(id) == -1){
        this.editedRows.push(id);
      }
    }
  }

  resetColumnNames(){
    for(var i = 0; i < this.settings.columns.length; i++){
      this.settings.columns[i].Name = undefined;
    }
    this.settings.useDefaultColumnNames = true;
  }

  setData(options){
    var PQT = this;
    if(options.data === undefined && options.metadata === undefined){
      throw new Error("setData requres its input as an array with properties \"data\" and/or \"metadata\".");
    }
    if(options.data !== undefined && Array.isArray(options.data)){
      this.data = options.data;
    }
    if(options.metadata !== undefined && Array.isArray(options.metadata)){
      this.metadata = options.metadata;
    }
    this.settings.pageNo = 1;
    this.draw();
  }

  sortData(){
    var PQT = this;
    PQT.data = PQT.data.sort(function(a,b){
      if(PQT.settings.sortColumn == null){
        return 0;
      }
      var value;
      if(a[PQT.metadata[PQT.settings.sortColumn].Name] == null){
        value = -1;
      }else if(b[PQT.metadata[PQT.settings.sortColumn].Name] == null){
        value = 1;
      }else{
        switch(PQT.metadata[PQT.settings.sortColumn].Type){
          case (-9):
            var aVal = a[PQT.metadata[PQT.settings.sortColumn].Name].toLowerCase();
            var bVal = b[PQT.metadata[PQT.settings.sortColumn].Name].toLowerCase();
            value = ( aVal == bVal ? 0 : ( ( aVal < bVal ) ? 1 : -1 ));
            break;
          case 91:
            var aVal = a[PQT.metadata[PQT.settings.sortColumn].Name].dateObj;
            var bVal = b[PQT.metadata[PQT.settings.sortColumn].Name].dateObj;
            if(aVal === undefined){
              aVal = new Date(a[PQT.metadata[PQT.settings.sortColumn].Name].date);
            }
            if(bVal === undefined){
              bVal = new Date(b[PQT.metadata[PQT.settings.sortColumn].Name].date);
            }
            value = aVal.valueOf() - bVal.valueOf();
            break;
          default:
            //this works for numerical values and Strings.
            value = ( a[PQT.metadata[PQT.settings.sortColumn].Name] == b[PQT.metadata[PQT.settings.sortColumn].Name] ) ? 0 : ( ( a[PQT.metadata[PQT.settings.sortColumn].Name] > b[PQT.metadata[PQT.settings.sortColumn].Name] ) ? 1 : -1 );
            break;
        }
      }
      if(PQT.settings.reverseSort){
        value *= -1;
      }
      return value;
    });
    PQT.settings.pageNo = 1;
    PQT.draw();
  }

  push(){
    var PQT = this;
    for(var i = 0; i < this.editedRows.length; i++){
      var item = this.editedRows.shift();
      var request = new XMLHttpRequest();
      request.onreadystatechange = function(){
        if(this.readyState == 4){
          if(this.status == 200){
            var response = JSON.parse(this.responseText);
            this.pendingRowRequests.splice(this.pendingRowRequests.indexOf(item), 1);
          }else if (PQT.settings.debug == true){
            console.log(this.responseText);
          }
        }
      };
      request.open('POST', PQT.settings.url, true);
      request.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
      request.send('action=update&'+ $(this.$table.find('#'+item)).serialize());
      this.pendingRowRequests.push(item);
    }
    for(var i = 0; i < this.deletedRows.length; i++){
      var item = this.deletedRows[i];
      var request = new XMLHttpRequest();
      request.onreadystatechange = function(){
        if(this.readyState == 4){
          if(this.status == 200){
            var response = JSON.parse(this.responseText);
            this.pendingRowRequests.splice(this.pendingRowRequests.indexOf(item), 1);
          }else if (PQT.settings.debug == true){
            console.log(this.responseText);
          }
        }
      };
      request.open('POST', PQT.settings.url, true);
      request.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
      request.send('action=delete&id='+item);
      this.pendingRowRequests.push(item);
    }
  }
  pull(){
    var PQT = this;
    var request = new XMLHttpRequest();
    request.onreadystatechange = function(){
      if(this.readyState == 4){
        if(this.status == 200){
          var response = JSON.parse(this.responseText);
          if(response.data === undefined || response.metadata === undefined){
            throw new Error("Received data or metadata it empty");
          }
          PQT.setData(response);
        }else if (PQT.settings.debug == true){
          console.log(this.responseText);
        }
      }
    }
    request.open('POST', this.settings.url, true);
    request.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    request.send('action=get');
  }
}
